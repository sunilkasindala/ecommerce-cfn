import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { call } from "../utils/dynamodbLib"
import { getSegment, log } from "../utils/logger"
import { AppConfig } from "../utils/appConfig";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { v4 as uuidv4 } from "uuid"//this one is for generating unique id's

const sqs = new SQSClient({ region: process.env.AWS_REGION });
const QUEUE_URL = process.env.NOTIFICATION_QUEUE_URL;

export const createuser = async (
    event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    log.info('Create user handler called !');
    const segment = getSegment();
    const subsegment = segment?.addNewSubsegment(`query SES template`);

    try {
        const body = event.body ? JSON.parse(event.body) : {};

        if (!body.name || !body.email) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "name and email are required" })
            };
        }

        // check for the existing email 
        const existingUser: any = await checkExistingUser(body);
        log.info('existing user for checking email '+ JSON.stringify(existingUser))

        //checks if email exist or not 
        if (existingUser.Items && existingUser.Items.length > 0) {
            return {
                statusCode: 409,
                body: JSON.stringify({ message: "email already exists" })
            };
        }

        log.info('Email doesnot exist !');

        body.userId = uuidv4()

        const params = {
            TableName: AppConfig.USER_TABLE,
            Item: body,
            ConditionExpression: "attribute_not_exists(userId)"
        }
        log.info("USERS_TABLE => " + AppConfig.USER_TABLE);
        log.info('creating user');
        await call('put', params);

        log.info('User created successfully');
        log.info(`logging the queue url ${QUEUE_URL}`);

        if (QUEUE_URL) triggerForEmailSend(body);

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


const triggerForEmailSend = async (body: any) => {
    const message = {
        type: "USER_CREATED",
        userId: body.userId,
        name: body.name,
        email: body.email
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


