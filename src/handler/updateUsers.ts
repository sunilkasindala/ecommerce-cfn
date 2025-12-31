import {APIGatewayProxyEvent,APIGatewayProxyResult} from "aws-lambda"
import {call} from "../utils/dynamodbLib"
import {log,getSegment} from "../utils/logger"
import { AppConfig } from "../utils/appConfig";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";


export const updateuser = async(event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult> => {
    const segment = getSegment();
    const subsegment = segment?.addNewSubsegment(`query SES template`);
    const sqs = new SQSClient({ region: process.env.AWS_REGION });
    const QUEUE_URL = process.env.NOTIFICATION_QUEUE_URL

    try{
        const {userId, name , email} = event.body ?JSON.parse(event.body) :{};

        log.info("parsed from body userId")
        log.info("parsed from body name")
        log.info("parsed from body email")

        const params = {
            TableName:AppConfig.USER_TABLE,
            Key:{userId},
            UpdateExpression:"SET #name = :name , #email = :email",
            ExpressionAttributeNames:{
                "#name" : "name",
                "#email" : "email"
            },
            ExpressionAttributeValues:{
                ":name" : name,
                ":email" : email
            },
            ReturnValues:"ALL_NEW"
        }

        const response = await call('update',params)
        log.info("user is updated successfully")
        if(QUEUE_URL){
            const message = {
                type: "USER_UPDATED",
                userId: userId,
                name: name,
                email: email
            }
            try {
                await sqs.send(
                    new SendMessageCommand({
                        QueueUrl: QUEUE_URL,
                        MessageBody:JSON.stringify(message)
                    })
                )
            log.info("Notification message sent to SQS")
            }catch(err){
                log.error("Failed to send SQS message: " + JSON.stringify(err));
            }
        }
        
        subsegment?.close();
        return {
            statusCode : 200,
            body:JSON.stringify({message:"user details updated successfully"})
        }

    }catch(err){
        log.error("cannot update the user"+JSON.stringify(err))
        return {
            statusCode : 500,
            body:JSON.stringify({message:"internal server error"})
        }
    }
}
