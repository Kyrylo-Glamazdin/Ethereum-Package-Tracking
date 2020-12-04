pragma solidity >=0.4.22 <0.7.0;
pragma experimental ABIEncoderV2;

// Package tracking contract. Used for tracking packages and sending package status updates
contract PackageTracking {
    // Struct of the contract user
    struct NetworkUser {
        bool hasEditRights; // indivator that shows whether the user has rights to send package status updates (true if yes)
        uint256[] sentPackageIDs; // the IDs of all packages where msg.sender is the package sender (user for finding packages associated with this address)
        uint256[] receivedPackageIDs; // the IDs of all packages where msg.sender is the package receiver (user for finding packages associated with this address)
    }
    
    // Struct of a package
    struct Package {
        uint256 id; // ID if the package. Gets assigned when package is registered
        string description; // name of description of the package
        address senderAddress; // address of the user that sends the package (helps to identify which packages belong to which address)
        address receiverAddress; // address of the user that receives the package (helps to identify which packages belong to which address)
        PackageStatus[] statusHistory; // the entire history of status updates of this package (from initialization to delivery)
        uint256 numOfStatusUpdates; // the number of status updates of this package
    }
    
    // Struct that defines the status of the package. Used for creating a history of package status updates
    struct PackageStatus {
        State currentPackageState; // state of the package during the status update. Can take one of the following values: {Initialized, Departed, Arrived, Delivered}
        uint256 statusTime; // time of status update (in unix timestamp)
        string currentPackageLocation; // the location where package update takes place
        address updatedBy; // address of the official responsible for updating the package
    }
    

    uint256 currentPackageId = 0; // counter used for assigning IDs for the newly registered packages
    address public departmentManagement; // the address of the contract creator. User's editing rights can be granted or taken away only from this address
    

    // the list of package states used for status updates
    enum State {Initialized, Departed, Arrived, Delivered}
    
    // creates a 'NetworkUser' struct for each address that accesses this contract
    mapping(address => NetworkUser) public networkUsers;
    // the list of all available packages in the network mapped by the package ID
    mapping(uint256 => Package) public packages;
    

    // the event that signifies that the package has been registered
    event PackageRegistered(
        uint256 packageId,
        string packageDescription,
        address packageSenderAddress,
        address packageReceiverAddress,
        string packageCurrentLocation,
        address registeredBy
    );
    
    // the event that indicates that the package has departed
    event PackageDeparted(
        uint256 packageId,
        string departedFrom,
        address updatedBy
    );
    
    // the event that indicates that the package has arrived
    event PackageArrived(
        uint256 packageId,
        string arrivedTo,
        address updatedBy
    );
    
    // the event that indicates that that package has been delivered
    event PackageDelivered(
        uint256 packageId,
        string deviveredTo,
        address updatedBy
    );


    // modifier checking if the user has the rights to provide package status updates
    modifier canEditPackageStatus() {
        require(networkUsers[msg.sender].hasEditRights, "Has no rights to edit");
        _;
    }
    //modifier checking if the user has the rights to appoint or discharge mail officials
    modifier canAppointMailOfficials() {
        require(msg.sender == departmentManagement, "No rights to appoint officials");
        _;
    }
    

    // create a package tracking contract where @departmentManagement is the contract creator
    constructor() public {
        departmentManagement = msg.sender;
        networkUsers[departmentManagement].hasEditRights = true;
    }
    

    // give editing rights to @mailman (can only be executed @departmentManagement)
    function giveMailOfficialsPrivilege(address mailman) public canAppointMailOfficials {
                networkUsers[mailman].hasEditRights = true;
    }

    // take away editing rights from @mailman (can only be executed @departmentManagement)
    function resignMailOfficial(address mailman) public canAppointMailOfficials {
                networkUsers[mailman].hasEditRights = false;
    }

    
    // add a new package to the blockchain (can only be executed by mail officials)
    // @packageDescription_ is the name or description of the package
    // @packageSenderAddress_ is the Ethereum address of the package sender
    // @packageReceiverAddress_ is the Ethereum address of the package recipient
    // @packageCurrentLocation_ is the location where the package is initiated
    // returns true if package was successfully registered and a new package ID
    function registerNewPackage(
        string memory packageDescription_,
        address packageSenderAddress_,
        address packageReceiverAddress_,
        string memory packageCurrentLocation_
    ) 
        public 
        canEditPackageStatus 
        returns (bool initiated, uint256 newPackageId) {
            packages[currentPackageId].id = currentPackageId;
            packages[currentPackageId].description = packageDescription_;
            packages[currentPackageId].senderAddress = packageSenderAddress_;
            packages[currentPackageId].receiverAddress = packageReceiverAddress_;
            
            initializePackage(currentPackageId, packageCurrentLocation_);

            
            networkUsers[packageSenderAddress_].sentPackageIDs.push(currentPackageId);
            networkUsers[packageReceiverAddress_].receivedPackageIDs.push(currentPackageId);
            
            uint256 returnId = currentPackageId;
            
            currentPackageId++;
            
            emit PackageRegistered(returnId, packageDescription_, packageSenderAddress_, packageReceiverAddress_, packageCurrentLocation_, msg.sender);
            
            return (true, returnId);
        }

    // internal function used to provide initial package status update
    // @packageId_ is the ID of the package
    // @packageCurrentLocation_ is the location where the package is initiated.
    // this function is only called by @registerNewPackage(...)
    function initializePackage(
        uint256 packageId_,
        string memory packageCurrentLocation_
    ) internal {
        PackageStatus memory updatedStatus = PackageStatus({
            currentPackageState: State.Initialized,
            statusTime: block.timestamp,
            currentPackageLocation: packageCurrentLocation_,
            updatedBy: msg.sender
        });
        
        packages[packageId_].statusHistory.push(updatedStatus);
        packages[packageId_].numOfStatusUpdates = 1;
    }

    // function that provides a status update and indicates that the package has departed from @packageCurrentLocation_ (can only be executed by mail officials)
    // @packageId_ is the ID of the package
    function departed(
        uint256 packageId_,
        string memory packageCurrentLocation_
    ) public canEditPackageStatus {
        PackageStatus memory updatedStatus = PackageStatus({
            currentPackageState: State.Departed,
            statusTime: block.timestamp,
            currentPackageLocation: packageCurrentLocation_,
            updatedBy: msg.sender
        });
        
        packages[packageId_].statusHistory.push(updatedStatus);
        packages[packageId_].numOfStatusUpdates++;
        
        emit PackageDeparted(packageId_, packageCurrentLocation_, msg.sender);
    }

    // function that provides a status update and indicates that the package has arrived to @packageCurrentLocation_ (can only be executed by mail officials)
    // @packageId_ is the ID of the package
    function arrived(
        uint256 packageId_,
        string memory packageCurrentLocation_
    ) public canEditPackageStatus {
        PackageStatus memory updatedStatus = PackageStatus({
            currentPackageState: State.Arrived,
            statusTime: block.timestamp,
            currentPackageLocation: packageCurrentLocation_,
            updatedBy: msg.sender
        });
        
        packages[packageId_].statusHistory.push(updatedStatus);
        packages[packageId_].numOfStatusUpdates++;
        
        emit PackageArrived(packageId_, packageCurrentLocation_, msg.sender);
    }

    // function that provides a status update and indicates that the package has been delivered to @packageCurrentLocation_ (can only be executed by mail officials)
    // @packageId_ is the ID of the package
    function devivered(
        uint256 packageId_,
        string memory packageCurrentLocation_
    ) public canEditPackageStatus {
        PackageStatus memory updatedStatus = PackageStatus({
            currentPackageState: State.Delivered,
            statusTime: block.timestamp,
            currentPackageLocation: packageCurrentLocation_,
            updatedBy: msg.sender
        });
        
        packages[packageId_].statusHistory.push(updatedStatus);
        packages[packageId_].numOfStatusUpdates++;
        
        emit PackageDelivered(packageId_, packageCurrentLocation_, msg.sender);
    }


    // returns true of package with @packageId_ has already been delivered
    function checkPackageDelivery(uint256 packageId_) 
        public 
        view 
        returns (bool) {
            uint256 numOfStatusUpdatesIndex = packages[packageId_].numOfStatusUpdates - 1;
            return packages[packageId_].statusHistory[numOfStatusUpdatesIndex].currentPackageState == State.Delivered;
        }

    // returns the latest status update of package with @packageId_
    function getPackageLatestStatus(uint256 packageId_) 
        public 
        view 
        returns (
            State, 
            uint256, 
            string memory, 
            address
        ) {
            Package storage p = packages[packageId_];
            PackageStatus storage s = p.statusHistory[p.statusHistory.length - 1];
            return (s.currentPackageState, s.statusTime, s.currentPackageLocation, s.updatedBy);
        }

    // returns the full status update history of the package with @packageId_
    function getPackageStatusHistory(uint256 packageId_) 
        public 
        view 
        returns (PackageStatus[] memory) {
            return packages[packageId_].statusHistory;
        }

    // get the IDs of all packages where msg.sender is the package sender
    function getAllSentPackageIDs() 
        public 
        view 
        returns (uint256[] memory) {
            return networkUsers[msg.sender].sentPackageIDs;
        }

    // get the IDs of all packages where msg.sender is the package receiver
    function getAllReceivedPackageIDs() 
        public 
        view 
        returns (uint256[] memory) {
            return networkUsers[msg.sender].receivedPackageIDs;
        }
}







