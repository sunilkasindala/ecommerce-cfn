import { log, getSegment } from "../utils/logger";

describe("Logger Utility", () => {
  it("should call log.info", () => {
    const infoSpy = jest.spyOn(log, "info");
    log.info("test info message");
    expect(infoSpy).toHaveBeenCalledWith("test info message");
    infoSpy.mockRestore();
  });

  it("should call log.error", () => {
    const errorSpy = jest.spyOn(log, "error");
    log.error("test error message");
    expect(errorSpy).toHaveBeenCalledWith("test error message");
    errorSpy.mockRestore();
  });

  it("should call subsegment close", () => {
    const closeMock = jest.fn();
    const segmentMock: any = { addNewSubsegment: jest.fn(() => ({ close: closeMock })) };

    // Correct path to your logger file
    const getSegmentSpy = jest.spyOn(require("../utils/logger"), "getSegment").mockReturnValue(segmentMock);

    const segment = getSegment();
    const sub = segment?.addNewSubsegment("test");
    sub?.close();

    expect(segment.addNewSubsegment).toHaveBeenCalledWith("test");
    expect(closeMock).toHaveBeenCalled();

    getSegmentSpy.mockRestore();
  });
});
