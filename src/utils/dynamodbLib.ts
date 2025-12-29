const {DynamoDBClient} = require('@aws-sdk/client-dynamodb')
const {DynamoDBDocumentClient, PutCommand , ScanCommand , UpdateCommand, DeleteCommand , QueryCommand , GetCommand} = require('@aws-sdk/lib-dynamodb')

const client = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(client)

const commandMap:Record<string, any> = {
    scan:ScanCommand,
    put:PutCommand,
    update:UpdateCommand,
    delete:DeleteCommand,
    query:QueryCommand,
    get:GetCommand
}
type DynamoDBParams = any;

export const call = async(action:string,params:DynamoDBParams):Promise<any> => {
    const command = commandMap[action]

    if(!command){
        throw new Error(`Invalid DynamoDB action: ${action}`)
    }
    const cmd = new command(params)
    return await docClient.send(cmd)
}


