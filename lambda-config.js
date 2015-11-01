module.exports = {
  FunctionName: 'event-processor',
  Description: 'Process stage 1 of the pipeline',
  Handler: 'index.handler',
  Role: 'arn:aws:iam::348454833122:role/lambda_s3_exec_role',
  Region: 'us-east-1',
  Runtime: 'nodejs',
  MemorySize: 128,
  Timeout: 60,
  Environment: 'production'
}
