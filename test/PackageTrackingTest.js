const PackageTracking = artifacts.require("PackageTracking");
const truffleAssert = require('truffle-assertions');


contract("PackageTracking", accounts => {
  //different Ethereum addresses that will be used to simulate different users
  const [firstAccount, secondAccount, thirdAccount, fourthAccount, fifthAccount] = accounts;

  //check if contract deployer's address is set as department management
  it("sets a department management", async () => {
    const pt = await PackageTracking.new();
    assert.equal(await pt.departmentManagement.call(), firstAccount);
  });

  //check if contract deployer has access to modify package statuses by default
  it("gives mail official rights to deployer by default", async() => {
    const pt = await PackageTracking.new();
    // the response should be a single bool value because other members of the struct haven't been initialized yet
    let mailRights = await pt.networkUsers.call(await pt.departmentManagement.call());
    assert.equal(mailRights, true);
  })

  //check if the users other than the contract deployer have access to modify package statuses by default
  it("doesn't give mail official rights to users other than deployer by default", async() => {
    const pt = await PackageTracking.new();
    // the response should be a single bool value because other members of the struct haven't been initialized yet
    let mailRights = await pt.networkUsers.call(secondAccount);
    assert.equal(mailRights, false);
  })

  //check if contract deployer has the rights to provide other addresses with the ability to modify package statuses
  it("appoints mail officials from department management address", async() => {
      const pt = await PackageTracking.new();
      await pt.giveMailOfficialsPrivilege(thirdAccount, {from: firstAccount})
      let mailmanAppointed = await pt.networkUsers.call(thirdAccount);
      assert.equal(mailmanAppointed, true);
  })

  //check if contract deployer has the rights to take away other addresses' ability to modify package statuses
  it("resigns mail officials from department management address", async() => {
      const pt = await PackageTracking.new();
      //takes mail edit rights away from itself (since they are given to deployer by default)
      await pt.resignMailOfficial(firstAccount, {from: firstAccount})
      let mailmanResigned = await pt.networkUsers.call(firstAccount);
      assert.equal(mailmanResigned, false);
  })

  //check if addresses other than contract deployer can give package edit rights to other addresses
  it("does not appoint mail officials from an address other than department management address", async() => {
        const pt = await PackageTracking.new();
        //assert succeeds if function call gets reverted
        await truffleAssert.fails(pt.giveMailOfficialsPrivilege(firstAccount, {from: secondAccount}), truffleAssert.ErrorType.REVERT, "No rights to appoint officials")
    })

    //check if addresses other than contract deployer can take away package edit rights from other addresses
  it("does not resign mail officials from an address other than department management address", async() => {
      const pt = await PackageTracking.new();
      //assert succeeds if function call gets reverted
      await truffleAssert.fails(pt.resignMailOfficial(firstAccount, {from: secondAccount}), truffleAssert.ErrorType.REVERT, "No rights to appoint officials")
  })

  //checks in addresses with package editing rights can register a new package to the system
  it("allows mail officials to register packages", async() => {
    const pt = await PackageTracking.new();
    //give thirdAccount the right to update packages
    await pt.giveMailOfficialsPrivilege(thirdAccount, {from: await pt.departmentManagement.call()})
    //assert succeeds if package has been registered
    await truffleAssert.passes(pt.registerNewPackage("Christmas gift", fourthAccount, fifthAccount, "New York", {from: thirdAccount}))
  })

  //checks if addresses without package editing rights can register a new package to the system
  it("does not allow random people to register packages", async() => {
    const pt = await PackageTracking.new();
    //thirdAccount does not have editing rights
    await truffleAssert.fails(pt.registerNewPackage("Christmas gift", fourthAccount, fifthAccount, "New York", {from: thirdAccount}), truffleAssert.ErrorType.REVERT, "Has no rights to edit")
  })

  //checks users' ability to retrieve package info (and checks for its accuracy)
  it("allows to access the package info by anyone using package id", async() => {
    const pt = await PackageTracking.new();
    //give thirdAccount the right to update packages
    await pt.giveMailOfficialsPrivilege(thirdAccount, {from: await pt.departmentManagement.call()})

    const newPackageDescription = "Christmas gift"
    const newPackageLocation = "New York"
    //call the function without saving the data to access the return value
    let returnValues = await pt.registerNewPackage.call(newPackageDescription, fourthAccount, fifthAccount, newPackageLocation, {from: thirdAccount})
    //call the function and update contract state
    await pt.registerNewPackage(newPackageDescription, fourthAccount, fifthAccount, newPackageLocation, {from: thirdAccount})
    let packageById = await pt.packages.call(returnValues.newPackageId)
    
    //assert that pt.packages[returnVal.newPackageId] contains all the entered information and was initialized properly
    assert.equal(packageById.id.toString(), returnValues.newPackageId.toString())
    assert.equal(packageById.description, newPackageDescription)
    assert.equal(packageById.senderAddress, fourthAccount)
    assert.equal(packageById.receiverAddress, fifthAccount)
    assert.equal(packageById.numOfStatusUpdates, 1)
  })

  //check if addresses with package editing rights can provide status updates on the packages
  it("allows mail officials to update the state of the package", async() => {
    const pt = await PackageTracking.new();
    //give secondAccount and thirdAccount the right to update packages
    await pt.giveMailOfficialsPrivilege(secondAccount, {from: await pt.departmentManagement.call()})
    await pt.giveMailOfficialsPrivilege(thirdAccount, {from: await pt.departmentManagement.call()})
    //call the function without saving the data to access the return value
    let returnValues = await pt.registerNewPackage.call("Christmas gift", fourthAccount, fifthAccount, "New York", {from: thirdAccount})
    let packageId = returnValues.newPackageId
    //call the function and update contract state
    await pt.registerNewPackage("Christmas gift", fourthAccount, fifthAccount, "New York", {from: thirdAccount})
    //assert that all 3 functions below succeed
    await truffleAssert.passes(pt.departed(packageId, "New York", {from: thirdAccount}), truffleAssert.ErrorType.REVERT, "Has no rights to edit")
    await truffleAssert.passes(pt.arrived(packageId, "New Jersey", {from: secondAccount}), truffleAssert.ErrorType.REVERT, "Has no rights to edit")
    await truffleAssert.passes(pt.delivered(packageId, "New Jersey", {from: secondAccount}), truffleAssert.ErrorType.REVERT, "Has no rights to edit")
  })

  //check if addresses without editing rights can provide package status updates
  it("does not allow random people to update the state of the package", async() => {
    const pt = await PackageTracking.new();
    //give thirdAccount the right to update packages
    await pt.giveMailOfficialsPrivilege(thirdAccount, {from: await pt.departmentManagement.call()})
    //call the function without saving the data to access the return value
    let returnValues = await pt.registerNewPackage.call("Christmas gift", fourthAccount, fifthAccount, "New York", {from: thirdAccount})
    let packageId = returnValues.newPackageId
    //call the function and update contract state
    await pt.registerNewPackage("Christmas gift", fourthAccount, fifthAccount, "New York", {from: thirdAccount})
    //secondAccount has no rights to edit functions
    //assert that all 3 function calls below made from secondAccount do not succeed
    await truffleAssert.fails(pt.departed(packageId, "New York", {from: secondAccount}), truffleAssert.ErrorType.REVERT, "Has no rights to edit")
    await truffleAssert.fails(pt.arrived(packageId, "New Jersey", {from: secondAccount}), truffleAssert.ErrorType.REVERT, "Has no rights to edit")
    await truffleAssert.fails(pt.delivered(packageId, "New Jersey", {from: secondAccount}), truffleAssert.ErrorType.REVERT, "Has no rights to edit")
  })

  it("shows that package has been delivered if it was delivered", async() => {
    const pt = await PackageTracking.new();
    //call the function without saving the data to access the return value
    let returnValues = await pt.registerNewPackage.call("Christmas gift", fourthAccount, fifthAccount, "New York", {from: await pt.departmentManagement.call()})
    let packageId = returnValues.newPackageId
    //call the function and update contract state
    await pt.registerNewPackage("Christmas gift", fourthAccount, fifthAccount, "New York", {from: await pt.departmentManagement.call()})
    //status update showing that package was delivered
    await pt.delivered(packageId, "New Jersey", {from: await pt.departmentManagement.call()})

    assert.equal(await pt.checkPackageDelivery(packageId), true)
  })

  it("shows that package has not been delivered if it wasn't delivered yet", async() => {
    const pt = await PackageTracking.new();
    //call the function without saving the data to access the return value
    let returnValues = await pt.registerNewPackage.call("Christmas gift", fourthAccount, fifthAccount, "New York", {from: await pt.departmentManagement.call()})
    let packageId = returnValues.newPackageId
    //call the function and update contract state
    await pt.registerNewPackage("Christmas gift", fourthAccount, fifthAccount, "New York", {from: await pt.departmentManagement.call()})

    assert.equal(await pt.checkPackageDelivery(packageId), false)
  })

  //check if package senders and recipients can get the IDs of the associated packages
  it("allows users to see the IDs of packages which they sent and received", async() => {
    const pt = await PackageTracking.new();
    //give thirdAccount the right to update packages
    await pt.giveMailOfficialsPrivilege(thirdAccount, {from: await pt.departmentManagement.call()})

    let fourthAccountSentPackages = []
    let secondAccountSentPackages = []
    let fifthAccountReceivedPackages = []
    let firstAccountReceivedPackages = []

    // * SIMULATE CREATING 5 DIFFERENT PACKAGES WITH MULTIPLE SENDERS AND RECEIVERS *

    //PACKAGE ID should be 0

    //call the function without saving the data to access the return value
    let returnValues0 = await pt.registerNewPackage.call("Christmas gift", fourthAccount, firstAccount, "New York", {from: thirdAccount})
    let packageId0 = returnValues0.newPackageId
    //call the function and update contract state
    await pt.registerNewPackage("Christmas gift", fourthAccount, fifthAccount, "New York", {from: thirdAccount})
    fourthAccountSentPackages.push(packageId0)
    fifthAccountReceivedPackages.push(packageId0)

    //PACKAGE ID should be 1

    let returnValues1 = await pt.registerNewPackage.call("New stock", secondAccount, firstAccount, "New Jersey", {from: thirdAccount})
    let packageId1 = returnValues1.newPackageId
    await pt.registerNewPackage("New stock", secondAccount, fifthAccount, "New Jersey", {from: thirdAccount})
    secondAccountSentPackages.push(packageId1)
    fifthAccountReceivedPackages.push(packageId1)

    //PACKAGE ID should be 2

    let returnValues2 = await pt.registerNewPackage.call("CS Book", fourthAccount, firstAccount, "California", {from: thirdAccount})
    let packageId2 = returnValues2.newPackageId
    await pt.registerNewPackage("CS Book", fourthAccount, firstAccount, "California", {from: thirdAccount})
    fourthAccountSentPackages.push(packageId2)
    firstAccountReceivedPackages.push(packageId2)

    //PACKAGE ID should be 3

    let returnValues3 = await pt.registerNewPackage.call("Secret package", fourthAccount, firstAccount, "Washington", {from: thirdAccount})
    let packageId3 = returnValues3.newPackageId
    await pt.registerNewPackage("Secret package", fourthAccount, firstAccount, "Washington", {from: thirdAccount})
    fourthAccountSentPackages.push(packageId3)
    firstAccountReceivedPackages.push(packageId3)

    //PACKAGE ID should be 4

    let returnValues4 = await pt.registerNewPackage.call("House Decorations", secondAccount, firstAccount, "New Jersey", {from: thirdAccount})
    let packageId4 = returnValues4.newPackageId
    await pt.registerNewPackage("House Decorations", secondAccount, fifthAccount, "Minnesota", {from: thirdAccount})
    secondAccountSentPackages.push(packageId4)
    fifthAccountReceivedPackages.push(packageId4)

    //package IDs where fourthAccount is the sender: 0, 2, 3
    //package IDs where secondAccount is the sender: 1, 4

    let sentPackagesOfUserFour = await pt.getAllSentPackageIDs({from: fourthAccount})
    let sentPackagesOfUserTwo = await pt.getAllSentPackageIDs({from: secondAccount})

    //assert that predicted package IDs correspond to actual package IDs where fourthAccound and secondAccount are package senders
    for (let i = 0; i < sentPackagesOfUserFour.length; i++) {
      assert.equal(sentPackagesOfUserFour[i].toString(), fourthAccountSentPackages[i].toString())
    }

    for (let i = 0; i < sentPackagesOfUserTwo.length; i++) {
      assert.equal(sentPackagesOfUserTwo[i].toString(), secondAccountSentPackages[i].toString())
    }

    let receivedPackagesOfUserFive = await pt.getAllReceivedPackageIDs({from: fifthAccount})
    let receivedPackagesOfUserOne = await pt.getAllReceivedPackageIDs({from: firstAccount})

    //assert that predicted package IDs correspond to actual package IDs where fifthAccoount and firstAccount are package recipients
    for (let i = 0; i < receivedPackagesOfUserFive.length; i++) {
      assert.equal(receivedPackagesOfUserFive[i].toString(), fifthAccountReceivedPackages[i].toString())
    }

    for (let i = 0; i < receivedPackagesOfUserOne.length; i++) {
      assert.equal(receivedPackagesOfUserOne[i].toString(), firstAccountReceivedPackages[i].toString())
    }
  })

  //check if the latest status update is correct
  it("shows correct latest package status", async() => {
    const pt = await PackageTracking.new();
    //give thirdAccount the right to update packages
    await pt.giveMailOfficialsPrivilege(thirdAccount, {from: await pt.departmentManagement.call()})

    //delivery status updates
    let firstState = {location: "New York", state: 0}
    let secondState = {location: "New York", state: 1}
    let thirdState = {location: "New Jersey", state: 2}
    let fourthState = {location: "New Jersey", state: 1}
    let fifthState = {location: "Pennsylvania", state: 2}
    let sixthState = {location: "Pennsylvania", state: 3}

    //get new package ID without altering the contract
    let returnValues = await pt.registerNewPackage.call("Christmas gift", fourthAccount, fifthAccount, firstState.location, {from: thirdAccount})
    let packageId = returnValues.newPackageId

    // * SIMULATE PACKAGE SHIPPING LIFECYCLE *

    //REGISTER PACKAGE
    await pt.registerNewPackage("Christmas gift", fourthAccount, fifthAccount, firstState.location, {from: thirdAccount})
    let updateOne = await pt.getPackageLatestStatus.call(packageId)
    //check first status update
    assert.equal(updateOne.updateState, firstState.state)
    assert.equal(updateOne.updateLocation, firstState.location)
    
    //DEPARTED FROM FIRST LOCATION
    await pt.departed(packageId, secondState.location, {from: thirdAccount})
    let updateTwo = await pt.getPackageLatestStatus.call(packageId)
    //check second status update
    assert.equal(updateTwo.updateState, secondState.state)
    assert.equal(updateTwo.updateLocation, secondState.location)

    //ARRIVED TO SECOND LOCATION
    await pt.arrived(packageId, thirdState.location, {from: thirdAccount})
    let updateThree = await pt.getPackageLatestStatus.call(packageId)
    //check third status update
    assert.equal(updateThree.updateState, thirdState.state)
    assert.equal(updateThree.updateLocation, thirdState.location)

    //DEPARTED FROM SECOND LOCATION
    await pt.departed(packageId, fourthState.location, {from: thirdAccount})
    let updateFour = await pt.getPackageLatestStatus.call(packageId)
    //check fourth status update
    assert.equal(updateFour.updateState, fourthState.state)
    assert.equal(updateFour.updateLocation, fourthState.location)

    //ARRIVED TO THIRD LOCATION
    await pt.arrived(packageId, fifthState.location, {from: thirdAccount})
    let updateFive = await pt.getPackageLatestStatus.call(packageId)
    //check fifth status update
    assert.equal(updateFive.updateState, fifthState.state)
    assert.equal(updateFive.updateLocation, fifthState.location)

    //DELIVERED TO THIRD LOCATION
    await pt.delivered(packageId, sixthState.location, {from: thirdAccount})
    let updateSix = await pt.getPackageLatestStatus.call(packageId)
    //check sixth status update
    assert.equal(updateSix.updateState, sixthState.state)
    assert.equal(updateSix.updateLocation, sixthState.location)
  })

  //check the correctness of package's complete status history
  it("shows complete package status history", async() => {
    const pt = await PackageTracking.new();
    //give secondAccount, thirdAccount, and fourthAccount the right to update packages (simulate status updates issued by different mailmen)
    await pt.giveMailOfficialsPrivilege(secondAccount, {from: await pt.departmentManagement.call()})
    await pt.giveMailOfficialsPrivilege(thirdAccount, {from: await pt.departmentManagement.call()})
    await pt.giveMailOfficialsPrivilege(fourthAccount, {from: await pt.departmentManagement.call()})

    //delivery status updates data
    let firstState = {location: "New York", state: 0}
    let secondState = {location: "New York", state: 1}
    let thirdState = {location: "New Jersey", state: 2}
    let fourthState = {location: "New Jersey", state: 1}
    let fifthState = {location: "Pennsylvania", state: 2}
    let sixthState = {location: "Pennsylvania", state: 3}

    let expectedStates = [firstState, secondState, thirdState, fourthState, fifthState, sixthState]

    //get new package ID without altering the contract
    let returnValues = await pt.registerNewPackage.call("Christmas gift", fourthAccount, fifthAccount, firstState.location, {from: thirdAccount})
    let packageId = returnValues.newPackageId

    // * SIMULATE PACKAGE SHIPPING LIFECYCLE *

    //REGISTER PACKAGE
    await pt.registerNewPackage("Christmas gift", fourthAccount, fifthAccount, firstState.location, {from: thirdAccount})
    
    //DEPARTED FROM FIRST LOCATION
    await pt.departed(packageId, secondState.location, {from: thirdAccount})

    //ARRIVED TO SECOND LOCATION
    await pt.arrived(packageId, thirdState.location, {from: secondAccount})

    //DEPARTED FROM SECOND LOCATION
    await pt.departed(packageId, fourthState.location, {from: secondAccount})

    //ARRIVED TO THIRD LOCATION
    await pt.arrived(packageId, fifthState.location, {from: fourthAccount})

    //DELIVERED TO THIRD LOCATION
    await pt.delivered(packageId, sixthState.location, {from: fourthAccount})

    let updateHistory = await pt.getPackageStatusHistory.call(packageId)
    
    let packageById = await pt.packages.call(packageId)

    //make sure that the number of updates is correct
    assert.equal(updateHistory.length, expectedStates.length)
    assert.equal(updateHistory.length, packageById.numOfStatusUpdates)

    for (let i = 0; i < updateHistory.length; i++) {
      assert.equal(updateHistory[i].currentPackageState, expectedStates[i].state)
      assert.equal(updateHistory[i].currentPackageLocation, expectedStates[i].location)
    }

    // * Uncomment the line below to see how package status history can be decoded for better human readability *
    //decodeStatusHistory(updateHistory)
  })
});



// * HELPER FUNCTIONS *

//These functions have nothing to do with testing but give an example of how package's status history can be decoded for better human readability.
//Uncomment the last line in 'it("shows complete package status history")' function above to see the output

function decodeStatusHistory(statusHistory) {
  for (let i = 0; i < statusHistory.length; i++){
    console.log(decodeSinglePackageStatus(statusHistory[i]))
  }
}

function decodeSinglePackageStatus(packageStatus) {
  let statusString = ""
  if (packageStatus.currentPackageState == 0) {
    statusString = "Initialized in "
  }
  else if (packageStatus.currentPackageState == 1) {
    statusString = "Departed from "
  }
  else if (packageStatus.currentPackageState == 2) {
    statusString = "Arrived to "
  }
  else {
    statusString = "Delivered to "
  }

  statusString = statusString + packageStatus.currentPackageLocation
  statusString = statusString + " at " + packageStatus.statusTime
  statusString = statusString + ". Updated by " + packageStatus.updatedBy

  return statusString
}
