import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
const COMMISION_RULE_TABLE_NAME = 'CommissionRules';
const CONTRACTS_TABLE_NAME = 'Contracts';
const COMMISION_METHOD_TABLE_NAME = 'CommissionMethods';

export class HubAccessComDatabaseStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
      super(scope, id, props);

      const contractsTable = new dynamodb.Table(this, 'Contracts', {
        tableName: CONTRACTS_TABLE_NAME,
        partitionKey: { name: 'agentId', type: dynamodb.AttributeType.STRING },
        sortKey: {name: 'contractId', type: dynamodb.AttributeType.STRING},
        readCapacity: 5,
        writeCapacity: 5,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        encryption: dynamodb.TableEncryption.AWS_MANAGED,
        pointInTimeRecovery:true
      });
  
      const contractsTableName = contractsTable.tableName
      new cdk.CfnOutput(this, 'ContractsTableName', {
        value: contractsTableName,
        exportName: 'ContractsTableName',
      });

      const commissionRuleTable = new dynamodb.Table(this, 'CommissionRules', {
        tableName: COMMISION_RULE_TABLE_NAME,
        partitionKey: { name: 'contractId', type: dynamodb.AttributeType.STRING },
        sortKey: {name: 'commissionRuleId', type: dynamodb.AttributeType.STRING},
        readCapacity: 5,
        writeCapacity: 5,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        encryption: dynamodb.TableEncryption.AWS_MANAGED,
        pointInTimeRecovery:true
      });
  
      const commissionRuleTableName = commissionRuleTable.tableName
      new cdk.CfnOutput(this, 'CommissionRulesTableName', {
        value: commissionRuleTableName,
        exportName: 'CommissionRulesTableName',
      });

      const commissionMethodTable = new dynamodb.Table(this, 'CommissionMethods', {
        tableName: COMMISION_METHOD_TABLE_NAME,
        partitionKey: { name: 'contractId', type: dynamodb.AttributeType.STRING },
        sortKey: {name: 'commissionMethodId', type: dynamodb.AttributeType.STRING},
        readCapacity: 5,
        writeCapacity: 5,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        encryption: dynamodb.TableEncryption.AWS_MANAGED,
        pointInTimeRecovery:true
      });
  
      const commissionMethodTableName = commissionMethodTable.tableName
      new cdk.CfnOutput(this, 'CommissionMethodsTableName', {
        value: commissionMethodTableName,
        exportName: 'CommissionMethodsTableName',
      });

    }
  }