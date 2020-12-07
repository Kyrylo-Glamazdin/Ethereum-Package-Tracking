# Ethereum-Package-Tracking

## Names & emails 

Kyrylo Glamazdin. kyrylo.glamazdin36@myhunter.cuny.edu

## Purpose of contract

The purpose of this smart contract is to provide an infrastructure for reliable and secure tracking of letters and packages. By storing all package-related information on the immutable blockchain ledger, the users will be able to view all the up-to-date information about the current status of their package(s), as well as its status & location history.

#

The structure of the package object is as follows
```
struct Package {
  int id // identification number of the package
  string description // the package name or description
  address sender // Ethereum address of the sender (used for identifying relevant packages)
  address receiver //Ethereum address of the receiver (used for identifying relevant packages)
  PackageStatus[] statusHistory // the history of all status updates of this package (see below for more details)
  int numOfStatusUpdates // the number of status updates of this package
}
```

The structure of a PackageStatus object used for status updates tracking
```
struct PackageStatus {
  State currentPackageState // enumerated state of the package. Can take one of the following values: {Initialized, Departed, Arrived, Delivered}
  int statusTime // the time of status update (in unix timestamp format)
  string currentPackageLocation // the location where status update takes place
  address updatedBy // Ethereum address of the person responsible for updating package status
}
```

#

In order to make the contract secure and to prevent random people from modifying package statuses, I propose the following user hierarchy:
1) A regular user. Can only view packages and their status info & status updates. Cannot modify anyting. Can access the following methods:
```
checkPackageDelivery(int packageId) // check if package has been delivered
getPackageLatestStatus (int packageId) // check the latest package status update
getPackageStatusHistory (int packageId) // get the whole history of status updates of a certain package
getAllSentPackageIDs() // get the IDs of all packages where msg.sender is the package sender
getAllReceivedPackageIDs() // get the IDs of all packages where msg.sender is the package receiver
```
2) A mail official (e.g. mailman, post office representative). Has all regular user rights and can also provide package status updates. Has access to the following methods:
```
registerNewPackage(...) // add new packages to the blockchain
departed(...) // status update: show that the package has departed from a certain location
arrived(...) // status update: show that package has arrived to a certain location
delivered(...) // status update: show that package has been delivered to the recipient
```
3) A department management. This is the creator of the contract. Department manager has access to all contract functionality, including appointing and discharging mail officials who can provide status updates. The appointment of mail officials can be done only from the department managenemt address. Has access to the following methods:
```
giveMailOfficialsPrivilege(address mailman) // appoint mail official
resignMailOfficial (address mailman) // take away mail official rights
```

The following is the network user struct:
```
struct NetworkUser {
  bool hasEditRight // indicates whether msg.sender can provide package status updates
  int[] sentPackageIDs // IDs of packages where msg.sender is the package sender
  int[] receivedPackageIDs // IDs of packages where msg.sender is the package recipient
}
```

The address of department management is stored as a separate variable in the contract

## Installation

Clone the repo, cd into it, and type:
```
npm install
```
This will install all of the dependencies. To run the tests, type:
```
./node_modules/.bin/truffle test
```
This will run the tests that ensure the correctness of contract's functionality.

#

The contract itself can be found at 
```
/contracts/PackageTracking.sol
```
The tests can be found at
```
/test/PackageTrackingTest.js
/test/PackageTrackingTest.sol
```

The majority of the tests are written in JavaScript because it allows to test the contract from multiple addresses (which is crucial for this contract).

## Sources

Ethereum contract testing essentials: https://michalzalecki.com/ethereum-test-driven-introduction-to-solidity/
Using truffle assertions: https://www.npmjs.com/package/truffle-assertions
Truffle documentation: https://www.trufflesuite.com/docs/truffle/getting-started/interacting-with-your-contracts
Solving variable type issues: https://ethereum.stackexchange.com/questions/79324/mocha-assertions-not-returning-correctly-on-assert-equal-with-bn
