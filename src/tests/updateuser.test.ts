process.env.NOTIFICATION_QUEUE_URL = "test-queue";
process.env.USER_TABLE = "test-users-table";

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

import { mockClient } from "aws-sdk-client-mock";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";

import { updateuser } from "../handler/updateUsers";
import { log } from "../utils/logger";

const ddbMock = mockClient(DynamoDBDocumentClient);

describe("updateuser lambda function", () => {

  beforeEach(() => {
    ddbMock.reset();
    sqsSendMock.mockClear();
    snsSendMock.mockClear();
  });

  it("should return 200 if the user is updated", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [{ userId: "2" }]
    });
    ddbMock.on(UpdateCommand).resolves({});

    const event: any = {
      body: JSON.stringify({
        userId: "2",
        name: "praneeth",
        email: "praneeth@gmail.com"
      })
    };

    const res = await updateuser(event);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).message)
      .toBe("user details updated successfully");
  });

  it("should return 500 if update throws error", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [{ userId: "2" }]
    });
    ddbMock.on(UpdateCommand).rejects(new Error("DB error"));

    const event: any = {
      body: JSON.stringify({
        userId: "2",
        name: "sunil",
        email: "sunil@gmail.com"
      })
    };

    const res = await updateuser(event);

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).message)
      .toBe("internal server error");
  });

  it("should trigger both SQS and SNS when mobile_no is present", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [{ userId: "5" }]
    });
    ddbMock.on(UpdateCommand).resolves({});

    const event: any = {
      body: JSON.stringify({
        userId: "5",
        name: "sunil",
        email: "sunil@gmail.com",
        mobile_no: "+919999999999"
      })
    };

    const res = await updateuser(event);

    expect(res.statusCode).toBe(200);
    expect(sqsSendMock).toHaveBeenCalled();
    expect(snsSendMock).toHaveBeenCalled();
  });

  it("should log error if SQS send fails", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [{ userId: "5" }]
    });
    ddbMock.on(UpdateCommand).resolves({});

    sqsSendMock.mockRejectedValueOnce(new Error("SQS failed"));

    const logSpy = jest
      .spyOn(log, "error")
      .mockImplementation(() => {});

    const event: any = {
      body: JSON.stringify({
        userId: "5",
        name: "sunil",
        email: "sunil@gmail.com",
        mobile_no: "+919999999999"
      })
    };

    await updateuser(event);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to send SQS message")
    );

    logSpy.mockRestore();
  });

  it("should log error if SNS publish fails", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [{ userId: "5" }]
    });
    ddbMock.on(UpdateCommand).resolves({});

    snsSendMock.mockRejectedValueOnce(new Error("SNS failed"));

    const logSpy = jest
      .spyOn(log, "error")
      .mockImplementation(() => {});

    const event: any = {
      body: JSON.stringify({
        userId: "5",
        name: "sunil",
        email: "sunil@gmail.com",
        mobile_no: "+919999999999"
      })
    };

    await updateuser(event);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("failed to send sns message")
    );

    logSpy.mockRestore();
  });
});
