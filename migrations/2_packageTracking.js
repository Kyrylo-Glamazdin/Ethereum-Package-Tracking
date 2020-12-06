const PackageTracking = artifacts.require('./PackageTracking.sol');

module.exports = function(deployer) {
    deployer.deploy(PackageTracking);
};