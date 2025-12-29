import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { call } from "../utils/dynamodbLib"
import { getSegment, log } from "../utils/logger"
import { AppConfig } from "../utils/appConfig";


export const createuser = async (
    event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const segment = getSegment();
    const subsegment = segment?.addNewSubsegment(`query SES template`);
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




