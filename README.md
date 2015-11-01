# event-processor
Lambda function that processes raw JSON events from S3 and distributes them to Redshift Firehoses that correspond to tables

API -> S3Firehose -> <b>event-processor</b> -> RedshiftFirehoses -> Redshift
