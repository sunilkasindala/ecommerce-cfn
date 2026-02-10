jest.mock("../utils/dynamodbLib", () => ({
  call: jest.fn()
}));

jest.mock("../utils/logger", () => ({
  log: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock("@aws-sdk/client-sqs", () => {
  const sendMock = jest.fn();
  return {
    SQS: jest.fn(() => ({ send: sendMock })),
    SendMessageCommand: jest.fn(),
    __sendMock: sendMock
  };
});

import { call } from "../utils/dynamodbLib";
import { log } from "../utils/logger";
import { documentReminder } from "../handler/documentReminderCron";

describe("documentReminderCron test cases", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should trigger reminder for users whose documents are not submitted", async () => {
    //arrange
    (call as jest.Mock).mockResolvedValue({
      Items: [
        { userId: "1", name: "sunil", email: "sunil@gmail.com", documentSubmitted: "false" },
        { userId: "2", name: "charan", email: "charan@gmail.com", documentSubmitted: "false" }
      ]
    });

    const sqsMock = jest.requireMock("@aws-sdk/client-sqs");
    const sendMock = sqsMock.__sendMock as jest.Mock;

    sendMock.mockResolvedValue({});

    const logInfoSpy = jest.spyOn(log, "info").mockImplementation(() => {});

    //act
    await documentReminder();
    //assert
    expect(call).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledTimes(2);

    expect(logInfoSpy).toHaveBeenCalledWith("Document reminder cron started");
    expect(logInfoSpy).toHaveBeenCalledWith("total users found 2");
    expect(logInfoSpy).toHaveBeenCalledWith(expect.stringContaining("Notification message sent to SQS for sunil@gmail.com"));
    expect(logInfoSpy).toHaveBeenCalledWith(expect.stringContaining("Notification message sent to SQS for charan@gmail.com"));

    logInfoSpy.mockRestore();
  });

  it("should log when no users are found", async () => {
    (call as jest.Mock).mockResolvedValue({ Items: [] });
    //arrange
    const logInfoSpy = jest.spyOn(log, "info").mockImplementation(() => {});
    //act
    await documentReminder();
    //assert
    expect(call).toHaveBeenCalledTimes(1);
    expect(logInfoSpy).toHaveBeenCalledWith("Document reminder cron started");
    expect(logInfoSpy).toHaveBeenCalledWith("total users found 0");

    logInfoSpy.mockRestore();
  });

  it("should log error when exception occurs", async () => {
    //arrange
    const error = new Error("DynamoDB failure");
    (call as jest.Mock).mockRejectedValue(error);

    const logErrorSpy = jest.spyOn(log, "error").mockImplementation(() => {});
    //act
    await documentReminder();
    //assert
    expect(logErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Error in document reminder cron")
    );

    logErrorSpy.mockRestore();
  });

  it("should log error when SQS send fails", async () => {
    (call as jest.Mock).mockResolvedValue({
      Items: [
        { userId: "1", name: "sunil", email: "sunil@gmail.com", documentSubmitted: "false" }
      ]
    });

    const sqsMock = jest.requireMock("@aws-sdk/client-sqs");
    const sendMock = sqsMock.__sendMock as jest.Mock;

    //arrange
    const sqsError = new Error("SQS failure");
    sendMock.mockRejectedValue(sqsError);

    const logErrorSpy = jest.spyOn(log, "error").mockImplementation(() => {});
    //act
    await documentReminder();
    //assert 
    expect(logErrorSpy).toHaveBeenCalledWith(
      "Failed to send SQS message:" + JSON.stringify(sqsError)
    );

    logErrorSpy.mockRestore();
})
})
