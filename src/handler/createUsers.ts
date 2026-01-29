import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getSegment, log } from "../utils/logger"
import { AppConfig } from "../utils/appConfig";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns"
import { v4 as uuidv4 } from "uuid";
import { isValidMobileNumber } from "../utils/validations";
import { isValidEmail } from "../utils/validations";


import { call } from "../utils/dynamodbLib";

const sqs = new SQSClient({ region: process.env.AWS_REGION });
const QUEUE_URL = process.env.NOTIFICATION_QUEUE_URL;
const sns = new SNSClient({ region: process.env.AWS_REGION });

export const createuser = async (
    event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    log.info('Create user handler called !');
    const segment = getSegment();
    const subsegment = segment?.addNewSubsegment(`query SES template`);

    try {
        const body = event.body ? JSON.parse(event.body) : {};

        if (!body.name || !body.email || !body.mobile_no) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "name ,email and mobile_no are required"
                })
            };
        }

        //email validation 
        if (!isValidEmail(body.email)) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "invalid email format"
                })
            }
        }

        //validation for mobile number 
        if (!isValidMobileNumber(body.mobile_no)) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Invalid mobile number format"
                })
            }
        }

        // check for the existing email 
        const existingUser: any = await checkExistingUser(body);
        log.info('existing user for checking email ' + JSON.stringify(existingUser))

        const existingMobile: any = await checkExistingMobile(body);
        log.info('existing user for checking  mobile' + JSON.stringify(existingMobile))

        //checks if email exist or not 
        if (existingUser.Items && existingUser.Items.length > 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "email already exists" })
            };
        }
        log.info('Email does not exist !');

        //checks if mobile exist or not 
        if (existingMobile.Items && existingMobile.Items.length > 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "mobile number already exists" })
            }
        }

        body.userId = uuidv4();
        const params = {
            TableName: AppConfig.USER_TABLE,
            Item: {
                userId:body.userId,
                name: body.name,
                email: body.email,
                mobile_no: body.mobile_no,
                documentSubmitted: "false"
            },
            ConditionExpression: "attribute_not_exists(userId)"
        }
        log.info("USERS_TABLE => " + AppConfig.USER_TABLE);
        log.info('creating user');

        await call('put', params);
        log.info('User created successfully');

        //so here once user is created we need to check for documents

        log.info(`logging the queue url ${QUEUE_URL}`);
        if (QUEUE_URL) await triggerForEmailSend(body);

        log.info(`mobile_no is present (${body.mobile_no}), triggering SNS SMS`);
        if (body.mobile_no) await triggerForSmsSend(body);
        log.info("SNS SMS trigger completed");

        subsegment?.close();
        return {
            statusCode: 201,
            body: JSON.stringify({ message: "user is created successfully" })
        }
    } catch (err) {
        log.error('Error while creating user' + JSON.stringify(err));
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "internal server error", err })
        }
    }
}


const checkExistingUser = async (body: any) => {
    //query on database using an idex on email
    const checkEmailparams = {
        TableName: AppConfig.USER_TABLE,
        IndexName: "email-index",
        KeyConditionExpression: "#email = :email",
        ExpressionAttributeNames: {
            "#email": "email"
        },
        ExpressionAttributeValues: {
            ":email": body.email
        }
    }
    //checks for email
    return await call('query', checkEmailparams)
}
const checkExistingMobile = async (body: any) => {
    const checkmobileparams = {
        TableName: AppConfig.USER_TABLE,
        IndexName: "mobile-index",
        KeyConditionExpression: "#mobile_no = :mobile_no",
        ExpressionAttributeNames: {
            "#mobile_no": "mobile_no"
        },
        ExpressionAttributeValues: {
            ":mobile_no": body.mobile_no
        }

    }
    return await call('query', checkmobileparams)
}

const triggerForEmailSend = async (body: any) => {
    const message = {
        type: "USER_CREATED",
        userId: body.userId,
        name: body.name,
        email: body.email,
        mobile_no: body.mobile_no
    };

    try {
        await sqs.send(
            new SendMessageCommand({
                QueueUrl: QUEUE_URL,
                MessageBody: JSON.stringify(message)
            })
        );
        log.info("Notification message sent to SQS");
    } catch (err) {
        log.error("Failed to send SQS message: " + JSON.stringify(err));
    }
}

const triggerForSmsSend = async (body: any) => {
    log.info("sms trigger started")
    const params = {
        Message: `Hello ${body.name}, your account has been created successfully.`,
        PhoneNumber: body.mobile_no
    }
    log.info("SNS Publish params: " + JSON.stringify(params));
    try {
        const response = await sns.send(
            new PublishCommand(params)
        );
        log.info("SNS publish response: " + JSON.stringify(response));
        log.info("sns successfully pushes the message to subscriber")
    } catch (err) {
        log.error("failed to send sns message" + JSON.stringify(err))
    }
}





