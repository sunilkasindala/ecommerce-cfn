// const {mockClient} = require('aws-sdk-client-mock')
import { mockClient } from "aws-sdk-client-mock"

// const {DynamoDBDocumentClient , UpdateCommand} = require("@aws-sdk/lib-dynamodb")
import { DynamoDBDocumentClient , UpdateCommand } from "@aws-sdk/lib-dynamodb"

const ddbMock = mockClient(DynamoDBDocumentClient)

// const {updateuser} = require('../src/users/updateUsers')
import {updateuser} from "../handler/updateUsers"

describe('test cases' , () => {
    beforeEach(() => {
        ddbMock.reset()
    })

describe('update user lambda functions' , () =>{
    it('should return 200 if the user is updated' , async () => {
    
    ddbMock.on(UpdateCommand).resolves({})
        //arrange
        const event:any = {
            body: JSON.stringify({userId:"2", name:"praneeth" , email:"praneeth@gmail.com"})
        }

        //act 
        const res = await updateuser(event)

        //assert
        expect(res.statusCode).toBe(200)
        const response = JSON.parse(res.body)
        expect(response.message).toBe('user details updated successfully')
    })
    it('should return 500 if it throws any error' , async () =>{
        ddbMock.on(UpdateCommand).rejects(new Error('DB error'))
        //arrange
        const event:any = {}

        //act
        const result = await updateuser(event)
        //assert 
        expect(result.statusCode).toBe(500)
        const response = JSON.parse(result.body)
        expect(response.message).toBe("internal server error")
    })
})
})
