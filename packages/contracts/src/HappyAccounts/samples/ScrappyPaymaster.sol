// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {IHappyPaymaster, SubmitterFeeTooHigh, WrongTarget} from "../interfaces/IHappyPaymaster.sol";
import {NotFromEntryPoint} from "../utils/Common.sol";
import {HappyTx} from "../core/HappyTx.sol";

/**
 * @title ScrappyPaymaster
 * @notice An example paymaster contract implementing the IHappyPaymaster interface.
 */
contract ScrappyPaymaster is IHappyPaymaster {
    //* //////////////////////////////////////
    //* Constants ////////////////////////////
    //* //////////////////////////////////////

    /// @dev TODO is the fixed siz of the MUD-encoded happyTx
    uint256 private constant TODO_VAR_1 = 224; // TODO Finalize

    /// @dev TODO is the gas cost of this function + call overhead
    uint256 private constant TODO_VAR_2 = 1234; // TODO Finalize

    /// @dev 280 is the max size of a tx with empty calldata with an empty access list.
    ///      Given RLP encoding, this should be significantly less.
    uint256 private constant MAX_TX_SIZE = 100; // TODO

    /// @dev Theis spaymaster sponsors all calls to this contract.
    address private immutable TARGET;

    /// @dev This paymaster refuses to pay more to the submitter than this amount of wei per byte
    ///      of data in the submitter tx.
    uint256 private immutable MAX_SUBMITTER_FEE_PER_BYTE;

    /// @dev The owner of the smart account
    address private owner;

    //* //////////////////////////////////////
    //* Events ///////////////////////////////
    //* //////////////////////////////////////

    event Upgraded(address indexed implementation);
    event Received(address sender, uint256 amount);

    //* //////////////////////////////////////
    //* Errors ///////////////////////////////
    //* //////////////////////////////////////

    error NotFromAccount();

    //* //////////////////////////////////////
    //* Modifiers ////////////////////////////
    //* //////////////////////////////////////

    /// @dev Checks if the the call was made from the EntryPoint contract
    modifier onlyFromEntryPoint() {
        if (msg.sender != ENTRYPOINT) revert NotFromEntryPoint();
        _;
    }

    modifier onlyForThisDest(HappyTx memory happyTx) {
        if (happyTx.dest != TARGET) {
            return WrongTarget.selector;
        }
        _;
    }

    //* //////////////////////////////////////
    //* Constructor //////////////////////////
    //* //////////////////////////////////////
    constructor(address _target, uint256 _maxSubmitterFeePerByte, address _owner) {
        TARGET = _target;
        MAX_SUBMITTER_FEE_PER_BYTE = _maxSubmitterFeePerByte;
        owner = _owner;
    }

    /**
     * @dev Initializer for proxy instances
     *      Called by factory during proxy deployment
     * @param _newOwner The owner who can upgrade the implementation
     */
    function initialize(address _newOwner) external payable {
        // TODO
    }

    function setOwner(address _owner) external {
        if (msg.sender != address(this)) {
            revert NotFromAccount();
        }

        owner = _owner;
    }

    //* //////////////////////////////////////
    //* External functions ///////////////////
    //* //////////////////////////////////////

    function payout(HappyTx memory happyTx, uint256 consumedGas)
        external
        onlyFromEntryPoint
        onlyForThisDest
        returns (bytes4)
    {
        uint256 maxSubmitterFee = (
            MAX_TX_SIZE + TODO_VAR + happyTx.callData.length + happyTx.validatorData.length + happyTx.extraData.length
        ) * MAX_SUBMITTER_FEE_PER_BYTE;

        if (happyTx.submitterFee > maxSubmitterFee) {
            return SubmitterFeeTooHigh.selector;
        }

        uint256 owed = (consumedGas + TODO_VAR_2) * happyTx.maxFeePerGas + happyTx.submitterFee;

        // solhint-disable-next-line avoid-tx-origin
        payable(tx.origin).call{value: owed}("");
        return 0;
    }

    //* //////////////////////////////////////
    //* Special functions ////////////////////
    //* //////////////////////////////////////

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    fallback() external payable {
        emit Received(msg.sender, msg.value);
    }
}
