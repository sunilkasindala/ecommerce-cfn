import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { call } from "../utils/dynamodbLib"
import { getSegment, log } from "../utils/logger"
import { AppConfig } from "../utils/appConfig";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";


export const createuser = async (
    event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const segment = getSegment();
    const subsegment = segment?.addNewSubsegment(`query SES template`);
    const sqs = new SQSClient({ region: process.env.AWS_REGION });
    const QUEUE_URL = process.env.NOTIFICATION_QUEUE_URL;


    try {

        const body = event.body ? JSON.parse(event.body) : {};


        const params = {
            TableName: AppConfig.USER_TABLE, 
            Item: {
                userId: body.userId,
                name: body.name,
                email: body.email
            }
        }

        await call('put', params)

        log.info('User created successfully');
        log.info(`looging the queue url ${QUEUE_URL}`);
        if (QUEUE_URL) {
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
        subsegment?.close();
        return {
            statusCode: 201,
            body: JSON.stringify({ message: "user is created successfully" })
        }
    } catch (err) {
        // console.log("err",err)
        log.error('Error while creating user'+JSON.stringify(err));
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "internal server error" ,err})
        }
    }
}




