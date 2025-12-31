import { SQSHandler } from "aws-lambda";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { log } from "../utils/logger";

const EMAIL_SOURCE = "kasindalasunil316@gmail.com";

const ses = new SESClient({ region: process.env.AWS_REGION })

export const handler: SQSHandler = async (event) => {
    for (const record of event.Records) {
        try {
            const message = JSON.parse(record.body);

            if (message.type === "USER_CREATED") {
                log.info({ email: message.email }, "Sending email via SES");

                const response = await ses.send(
                    new SendEmailCommand({
                        Source:EMAIL_SOURCE,
                        Destination: {
                            ToAddresses: [message.email],
                        },
                        Message: {
                            Subject: { Data: "Account Created!" },
                            Body: {
                                Text: {
                                    Data: `Hi ${message.name}, your account has been created.`,
                                },
                            },
                        },
                    })
                );

                log.info(
                    { messageId: response.MessageId },
                    "SES accepted the email"
                );
            } 
            else if (message.type === "USER_UPDATED") {
                log.info({ email: message.email }, "Sending email via SES");

                const response = await ses.send(
                    new SendEmailCommand({
                        Source: EMAIL_SOURCE,
                        Destination:{
                            ToAddresses:[message.email],
                        },
                        Message:{
                            Subject:{Data: "user updated successfully"},
                            Body: {
                                Text:{
                                    Data: `hello ${message.name}, your deails has been updated successfully.`
                                },
                            },
                        },
                    })
                );
                log.info(
                    { messageId:response.MessageId },
                    "SES accepted the email"
                );

            }
        } catch (err) {
            log.error({ err }, "Failed to send SES email");
            throw err;
        }
    }
};
