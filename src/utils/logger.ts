// const { Logger } = require('@aws-lambda-powertools/logger');

// export const logger = new Logger({
//   serviceName: 'users-service'
// });

import pino from 'pino';
import AWSXRay from 'aws-xray-sdk-core';

import https from 'https';
AWSXRay.captureHTTPsGlobal(https);

const parentLogger: pino.Logger = pino({
  name: 'cfn-conversion',
});

export let log = parentLogger;
/**
 * Sets the child logger so that the Lambda awsRequestId is attached to all the log statements.
 *
 * @param awsRequestId Every lambda invocation has a unique request id. This request id corresponds to that invocation.
 */
export function setAwsRequestIdForLogger(event: any, context: any): void {
  const AmznTraceId = event.headers === undefined ? null : event.headers["X-Amzn-Trace-Id"];
  const awsRequestId = context === undefined ? null : context.awsRequestId;
  const logSource = event.logSource == undefined ? "web" : event.logSource; //find way for get info
  const logGroupName = context === undefined ? null : context.logGroupName;
  const logStreamName = context === undefined ? null : context.logStreamName;
  const headers = event.headers;

  log = parentLogger.child({ AmznTraceId, awsRequestId, logSource, logGroupName, logStreamName, headers });
}

export const getSegment = () => {
  AWSXRay.setContextMissingStrategy("LOG_ERROR");
  return {
    addNewSubsegment(name:string) {
      log.info(`Creating segment: ${name}`);
      return {
        close() {
          log.info('subsegment closing.');
        }
      };
    }
  };
};

