// * Most contract tests can be found in PackageTrackingTest.js due to the need to simulate contract interaction from different addresses *

pragma solidity >=0.4.22 <0.7.0;

import "truffle/Assert.sol";
import "../contracts/PackageTracking.sol";
import "truffle/DeployedAddresses.sol";

contract PackageTrackingTest {
    //check if contract deployer's address is set as department management on a new contract
    function testDepartmentManagementSetting() public {
        PackageTracking pt = new PackageTracking();
        Assert.equal(pt.departmentManagement(), address(this), "Department management is not the deployer");
    }

    //check if contract deployer's address is set as department management on an existing contract
    function testDepartmentManagementSettingOfDeployedContract() public {
        PackageTracking pt = PackageTracking(DeployedAddresses.PackageTracking());
        Assert.equal(pt.departmentManagement(), msg.sender, "Department management is not the deployer");
    }
}