const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');

const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('../../../fabric-samples/test-application/javascript/CAUtil');
const { buildCCPOrg1, buildWallet } = require('../../../fabric-samples/test-application/javascript/AppUtil');

const channelName = 'mychannel';
const chaincodeName = 'basic';
const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, '..', '..', 'wallet');
const org1UserId = 'appUser';

function prettyJSONString(inputString) {
	return JSON.stringify(JSON.parse(inputString), null, 2);
}

exports.start = async function() {
    try {
		// build an in memory object with the network configuration (also known as a connection profile)
		const ccp = buildCCPOrg1();

		// build an instance of the fabric ca services client based on
		// the information in the network configuration
		const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');

		// setup the wallet to hold the credentials of the application user
		const wallet = await buildWallet(Wallets, walletPath);

		// in a real application this would be done on an administrative flow, and only once
		await enrollAdmin(caClient, wallet, mspOrg1);

		// in a real application this would be done only when a new user was required to be added
		// and would be part of an administrative flow
		await registerAndEnrollUser(caClient, wallet, mspOrg1, org1UserId, 'org1.department1');

		// Create a new gateway instance for interacting with the fabric network.
		// In a real application this would be done as the backend server session is setup for
		// a user that has been verified.
		const gateway = new Gateway();

		// setup the gateway instance
		// The user will now be able to create connections to the fabric network and be able to
		// submit transactions and query. All transactions submitted by this gateway will be
		// signed by this user using the credentials stored in the wallet.
		await gateway.connect(ccp, {
			wallet,
			identity: org1UserId,
			discovery: { enabled: true, asLocalhost: false } // using asLocalhost as this gateway is using a fabric network deployed locally
		});

		// Build a network instance based on the channel where the smart contract is deployed
		const network = await gateway.getNetwork(channelName);

		// Get the contract from the network.
		const contract = network.getContract(chaincodeName);
		await contract.submitTransaction('InitLedger');
		global.fabricContract = contract;
	} catch (error) {
		console.error(`******** FAILED to run the application: ${error}`);
	}
}

exports.GetAllAssets = async function() {
    console.log('\n--> Evaluate Transaction: GetAllAssets, function returns all the current assets on the ledger');
	let result = await global.fabricContract.evaluateTransaction('GetAllAssets');
	console.log(`*** Result: ${prettyJSONString(result.toString())}`);
}

exports.CreateAsset = async function(student_id, course_id, course_completedTasks) {
    console.log('\n--> Submit Transaction: CreateAsset, creates new asset with student_id, course_id, course_completedTasks arguments');
	result = await global.fabricContract.submitTransaction('CreateAsset', student_id, course_id, course_completedTasks);
	console.log('*** Result: committed');
	if (`${result}` !== '') {
		console.log(`*** Result: ${prettyJSONString(result.toString())}`);
	}
}

exports.AssetExists = async function() {
    console.log('\n--> Evaluate Transaction: AssetExists, function returns "true" if an asset with given assetID exist');
	result = await global.fabricContract.evaluateTransaction('AssetExists', 'asset1');
	console.log(`*** Result: ${prettyJSONString(result.toString())}`);
}