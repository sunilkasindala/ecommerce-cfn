// const { mockClient } = require('aws-sdk-client-mock');
import {mockClient} from "aws-sdk-client-mock";

// const { DynamoDBDocumentClient, GetCommand , ScanCommand} = require('@aws-sdk/lib-dynamodb');
import { DynamoDBDocumentClient, GetCommand , ScanCommand } from "@aws-sdk/lib-dynamodb";

const ddbMock = mockClient(DynamoDBDocumentClient);
// const { getuser, scanusers } = require('../src/users/getUsers');
import {getuser , scanusers} from "../handler/getUsers"

import {call} from "../utils/dynamodbLib"
describe('DynamoDB user handlers', () => {

  beforeEach(() => {
    ddbMock.reset();
  });

describe('getting user item' , () =>{
    test('should return 200 if we are getting item' , async() => {

    ddbMock.on(GetCommand).resolves({
    Item: { userId: "5", name: "Sunil" ,email:"sunil@gmail.com"}
});
        //arrange
        const event:any = {
            queryStringParameters:{
                userId:"5"
            }
        }
        //act
        const result = await getuser(event)
        //assert
        expect(result.statusCode).toBe(200)
        const body = JSON.parse(result.body)
        expect(body.data.userId).toBe("5")
    })
    test('should return 400 if the field is missing', async () => {
        //arrange
        const event:any = {
            queryStringParameters:{}
        }
        //act 
        const missingfield = await getuser(event)
        //assert 
        expect(missingfield.statusCode).toBe(400)
        const body = JSON.parse(missingfield.body)
        expect(body.message).toBe('Missing userId')
    })
    it('should return 500 if it throws error', async () => {
        ddbMock.on(GetCommand).rejects(new Error('db failure'))
        //arange
        const event:any = {
             queryStringParameters: {
      userId: "123"
    }
        }

        //act
        const result = await getuser(event)

        //assert
        expect(result.statusCode).toBe(500)
        const response = JSON.parse(result.body)
        expect(response.message).toBe("internal server error")
    })
      it('should throw error for invalid DynamoDB action', async () => {
    await expect(call('invalidAction', {})).rejects.toThrow(
      'Invalid DynamoDB action: invalidAction'
    );
  });
})


describe('getting all users', () =>{
    it('should return 200 if the items retrieved', async () =>{
    
    ddbMock.on(ScanCommand).resolves({
    Items:[
        {userId:"1" , name:"ashraf" , email : "asharf@gmail.com"},
        {userId:"2" , name:"suraj" , email:"suraj@gmail.com"}
    ]
})
        //arrange
        const event:any = {}

        //act
        const res = await scanusers(event)
        //assert
        expect(res.statusCode).toBe(200)

        const response = JSON.parse(res.body)
        expect(response.message).toBe("got the items from the dynamodb");
        expect(response.result.Items.length).toBe(2);
        expect(response.result.Items[0].userId).toBe("1");

    })

    it('should return 400 if there is not data to fetch', async () =>{
        //arrange
        const event:any = {}

        //act
        const result = await scanusers(event)

        //assert
        expect(result.statusCode).toBe(400)
        const response = JSON.parse(result.body)
        expect(response.message).toBe("there is no data available to fetch");

    })
    it('should return 500 if it throws error' , async () => {
    ddbMock.on(ScanCommand).rejects(new Error("DynamoDB failure"));

        //assert
        const event:any = {}

        //act
        const res = await scanusers(event)
        //assert
        expect(res.statusCode).toBe(500)
        const response = JSON.parse(res.body)
        expect(response.message).toBe("internal server error")
    })
})

})
