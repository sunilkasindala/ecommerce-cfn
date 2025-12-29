import {APIGatewayProxyEvent,APIGatewayProxyResult} from "aws-lambda"
import {call} from "../utils/dynamodbLib"
import {log,getSegment} from "../utils/logger"
import { AppConfig } from "../utils/appConfig";

export const updateuser = async(event:APIGatewayProxyEvent):Promise<APIGatewayProxyResult> => {
    const segment = getSegment();
    const subsegment = segment?.addNewSubsegment(`query SES template`);
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
