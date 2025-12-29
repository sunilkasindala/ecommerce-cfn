// const {mockClient} = require('aws-sdk-client-mock')
import { mockClient } from "aws-sdk-client-mock"
// const {DynamoDBDocumentClient , DeleteCommand} = require("@aws-sdk/lib-dynamodb")
import { DynamoDBDocumentClient , DeleteCommand } from "@aws-sdk/lib-dynamodb"

const ddbMock = mockClient(DynamoDBDocumentClient)

// const {deleteuser} = require('../src/users/deleteUsers')
import {deleteuser} from "../handler/deleteUsers"

describe('test cases' , () => {
    beforeEach(() => {
        ddbMock.reset()
    })


describe('delete lambda function test', () =>{
    it('return 200 if the user is deleted' , async () => {
        ddbMock.on(DeleteCommand).resolves({})
        //arrange
        const event:any = {
            queryStringParameters:{
                userId:"1"
            }
        }
        //act
        const result = await deleteuser(event)
        //assert
        expect(result.statusCode).toBe(200)
        const response = JSON.parse(result.body)
        expect(response.message).toBe('user is deleted successfully')
    })

    it('return 400 if the userId is missing', async () => {
        //arrange
        const event:any= {
            queryStringParameters:{}
        }
        //act
        const res = await deleteuser(event)

        //assert
        expect(res.statusCode).toBe(400)
        const response = JSON.parse(res.body)
        expect(response.message).toBe('Missing userId')
    })
       it('should return 500 if it throws error' ,async () => {
        ddbMock.on(DeleteCommand).rejects(new Error('DB error'))
        //arrange
        const event:any = {
             queryStringParameters: {
      userId: "123"
    }
        }
        //act 
        const result = await deleteuser(event)

        //assert
        expect(result.statusCode).toBe(500)
        const response = JSON.parse(result.body)
        expect(response.message).toBe("internal server error")
    })
})
})

