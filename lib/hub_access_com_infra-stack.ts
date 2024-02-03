import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CodeBuildHubAccessComServiceStack } from './codebuild';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class HubAccessComInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'HubAccessComInfraQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });

    const codeBuild = new CodeBuildHubAccessComServiceStack(scope,'CodeBuildHubAccessComServiceStack',props)

  }
}
