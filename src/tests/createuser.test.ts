// const {mockClient} = require('aws-sdk-client-mock')
import { mockClient } from "aws-sdk-client-mock"
// const {DynamoDBDocumentClient , PutCommand} = require('@aws-sdk/lib-dynamodb')
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb"
const ddbMock = mockClient(DynamoDBDocumentClient)

// const {createuser} = require('../src/users/createUsers')
import { createuser } from "../handler/createUsers"

describe('test cases', () => {
  beforeEach(() => {
    ddbMock.reset()
  })

  describe('createuser lambda function', () => {
    it('return 201 if the user is created', async () => {
      ddbMock.on(PutCommand).resolves({})
      //arrange
      const event: any = {
        body: JSON.stringify({ userId: "8", name: "naveen", email: "naveen@gmail.com" })
      }

      //act 
      const result = await createuser(event)

      //assert
      expect(result.statusCode).toBe(201)
      const response = JSON.parse(result.body)
      expect(response.message).toBe('user is created successfully')
    })
    it('should return 500 if it throws error', async () => {
      ddbMock.on(PutCommand).rejects(new Error('DB error'))
      //arrange
      const event: any = {}

      //act 
      const result = await createuser(event)
      //assert
      expect(result.statusCode).toBe(500)
      const response = JSON.parse(result.body)
      expect(response.message).toBe("internal server error")
    })
  })
})

