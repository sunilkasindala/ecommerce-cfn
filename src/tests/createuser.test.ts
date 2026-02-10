process.env.NOTIFICATION_QUEUE_URL = "test-queue";
process.env.USERS_TABLE = "test-users-table";

const sqsSendMock = jest.fn().mockResolvedValue({});
const snsSendMock = jest.fn().mockResolvedValue({});

jest.mock("@aws-sdk/client-sqs", () => ({
  SQSClient: jest.fn(() => ({ send: sqsSendMock })),
  SendMessageCommand: jest.fn()
}));

jest.mock("@aws-sdk/client-sns", () => ({
  SNSClient: jest.fn(() => ({ send: snsSendMock })),
  PublishCommand: jest.fn()
}));

jest.mock("uuid", () => ({ v4: () => "test-uuid" }));


import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { createuser } from "../handler/createUsers";
import { log, setAwsRequestIdForLogger } from "../utils/logger";

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('test cases', () => {
  beforeEach(() => {
    ddbMock.reset();
    sqsSendMock.mockClear();//clear mock calls before each test
    snsSendMock.mockClear();
  });

  describe('createuser lambda function', () => {
    //test case for missing fields
    it('should return 400 if the required fields are missing', async () => {
      //arrange
      const event: any = {
        body: JSON.stringify({ email: "sunil@gmail.com" })

      }
      //act
      const res = await createuser(event)
      //assert
      expect(res.statusCode).toBe(400)
      const response = JSON.parse(res.body)
      expect(response.message).toBe('name ,email and mobile_no are required')

    })
    //test case for invalid email format
    it('should return 400 if email format is invalid', async () => {
      //arrange
      const event: any = {
        body: JSON.stringify({
          name: "sunil",
          email: "invalid-email",
          mobile_no: "+918328465116"
        })
      }
      //act
      const res = await createuser(event)

      //assert
      expect(res.statusCode).toBe(400)
      const response = JSON.parse(res.body)
      expect(response.message).toBe("invalid email format")
    })
    //test case for invalid mobile_no
    it('should return 400 if mobile_no is invalid', async () => {
      //arrange
      const event: any = {
        body: JSON.stringify({
          name: 'sunil',
          email: 'sunil316@gmail.com',
          mobile_no: "+2378698056591"
        })
      }
      //act
      const res = await createuser(event)
      //assert
      expect(res.statusCode).toBe(400)
      const response = JSON.parse(res.body)
      expect(response.message).toBe('Invalid mobile number format')
    })
    //test case for checking existing email
    it('should return 400 if email already exists', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [{ email: "sunil@test.com" }]
      });
      //arrange
      const event: any = {
        body: JSON.stringify({
          name: "sunil",
          email: "sunil@gmail.com",
          mobile_no: "+918328465116"
        })
      }
      //act
      const res = await createuser(event)
      //assert
      expect(res.statusCode).toBe(400)
      const response = JSON.parse(res.body)
      expect(response.message).toBe('email already exists')
    })
    //test case for checking existing mobile_no
    it('should return 400 if mobile_no already exists', async () => {
      ddbMock
        .on(QueryCommand)
        .resolvesOnce({ Items: [] }) // email check
        .resolvesOnce({ Items: [{ mobile_no: "+919999999999" }] });

      //arrange
      const event: any = {
        body: JSON.stringify({
          name: "sunil",
          email: "sunil@gmail.com",
          mobile_no: "+919999999999"
        })
      }
      //act
      const res = await createuser(event)

      //assert
      expect(res.statusCode).toBe(400)
    })
    //test case for creating the user and mocking 
    it('return 201 if the user is created', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });
      ddbMock.on(QueryCommand).resolves({ Items: [] });
      ddbMock.on(PutCommand).resolves({})
      //arrange
      const event: any = {
        body: JSON.stringify({ name: "naveen", email: "naveen@gmail.com", mobile_no: "+918328465116" })
      }
      //act 
      const result = await createuser(event)
      //assert
      expect(result.statusCode).toBe(201)
      const response = JSON.parse(result.body)
      expect(response.message).toBe('user is created successfully')
    })

    it('should return 500 if it throws error', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] })
      ddbMock.on(PutCommand).rejects(new Error('DB error'))
      //arrange
      const event: any = {
        body: JSON.stringify({ name: "naveen", email: "naveen@gmail.com", mobile_no: "+918328465116" })
      }

      //act 
      const result = await createuser(event)
      //assert
      expect(result.statusCode).toBe(500)
      const response = JSON.parse(result.body)
      expect(response.message).toBe("internal server error")
    })
    it("should trigger both SQS and SNS when QUEUE_URL and mobile_no are present", async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });
      ddbMock.on(PutCommand).resolves({});

      process.env.NOTIFICATION_QUEUE_URL = "test-queue";

      const event: any = {
        body: JSON.stringify({ name: "sunil", email: "sunil@gmail.com", mobile_no: "+919999999999" })
      };

      const result = await createuser(event);
      console.log("result",result)
      expect(result.statusCode).toBe(201);
      const response = JSON.parse(result.body);
      expect(response.message).toBe("user is created successfully");

      //Confirm triggers were called
      expect(sqsSendMock).toHaveBeenCalled();
      expect(snsSendMock).toHaveBeenCalled();
    });
    it("should log error if SQS send fails", async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });
      ddbMock.on(PutCommand).resolves({});

      // Make SQS send fail
      sqsSendMock.mockRejectedValueOnce(new Error("SQS failed"));

      process.env.NOTIFICATION_QUEUE_URL = "test-queue";

      // Spy on log.error
      const logSpy = jest.spyOn(log, "error").mockImplementation(() => { }); // mock implementation to suppress actual logging

      const event: any = {
        body: JSON.stringify({ name: "sunil", email: "sunil@gmail.com", mobile_no: "+919999999999" })
      };

      await createuser(event);

      // Check that log.error was called for SQS
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to send SQS message")
      );

      // Restore spy
      logSpy.mockRestore();
    });
    it("should log error if SNS publish fails", async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });
      ddbMock.on(PutCommand).resolves({});

      // Make SNS send fail
      snsSendMock.mockRejectedValueOnce(new Error("SNS failed"));

      process.env.NOTIFICATION_QUEUE_URL = "test-queue";

      // Spy on log.error
      const logSpy = jest.spyOn(log, "error").mockImplementation(() => { });

      const event: any = {
        body: JSON.stringify({ name: "sunil", email: "sunil@gmail.com", mobile_no: "+919999999999" })
      };

      await createuser(event);

      // Check that log.error was called for SNS
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("failed to send sns message")
      );

      logSpy.mockRestore();
    });
  });
});

describe("Logger Utility - setAwsRequestIdForLogger", () => {
  it("should set child logger with proper context", () => {
    // Mock a fake event and context
    const event: any = {
      headers: {
        "X-Amzn-Trace-Id": "trace-id-123"
      },
      logSource: "mobile-app"
    };

    const context: any = {
      awsRequestId: "aws-request-456",
      logGroupName: "log-group",
      logStreamName: "log-stream"
    };

    // Call the function
    setAwsRequestIdForLogger(event, context);

    // Check that log object exists and has child function
    expect(log).toBeDefined();
    expect(typeof log.child).toBe("function"); // since child returns a logger
  });

  it("should handle missing headers and context", () => {
    const event: any = {};
    const context: any = {};

    setAwsRequestIdForLogger(event, context);

    expect(log).toBeDefined();
    expect(typeof log.child).toBe("function");
  });
});