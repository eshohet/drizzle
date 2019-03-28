/* eslint import/first: 0 */
jest.mock('../src/DrizzleContract')
import DrizzleContract from '../src/DrizzleContract'

import { getWeb3Assets } from './utils/helpers'
import Drizzle, { getOrCreateWeb3Contract } from '../src/Drizzle'

describe('Drizzle', () => {
  const networkId = global.defaultNetworkId
  let accounts

  beforeAll(async () => {
    ;({ accounts } = await getWeb3Assets())
  })

  describe('Unit', () => {
    describe('getOrCreateWeb3Contract', () => {
      let mockedStore, state

      beforeEach(() => {
        state = { web3: { networkId }, accounts }
        mockedStore = { getState: () => state }
      })

      test('recognizes a web3 contract', () => {
        const mockedWeb3Contract = {}
        const mockedContractConfig = { web3Contract: mockedWeb3Contract }

        const resolved = getOrCreateWeb3Contract(mockedStore, mockedContractConfig, {})
        expect(resolved).toBe(mockedWeb3Contract)
      })

      test('recognizes a truffleArtifact', () => {
        const address = '0x0123456789'
        const abi = 'ABI'
        const deployedBytecode = 'deadbeef'
        const mockedTruffleArtifact = {
          abi,
          networks: {[networkId]: {address}},
          deployedBytecode
        }
        const contractCreatorSpy = jest.fn()
        const mockedWeb3 = { eth: { Contract: contractCreatorSpy } }
        getOrCreateWeb3Contract(mockedStore, mockedTruffleArtifact, mockedWeb3)

        // Default selected is the 1st by convention
        const selectedAccount = accounts[0]
        const expectedArgs = [abi, address, { from: selectedAccount, data: deployedBytecode }]
        expect(contractCreatorSpy).toHaveBeenCalledWith(...expectedArgs)
      })
    })
  })

  describe('API', () => {
    let dispatchSpy, mockedStore, state

    let drizzle, drizzleOptions
    let contractCreatorSpy

    beforeEach(async () => {
      contractCreatorSpy = jest.fn()
      let mockedWeb3 = { eth: { Contract: contractCreatorSpy } }
      dispatchSpy = jest.fn()
      drizzleOptions = {}
      state = { web3: { networkId }, accounts }
      mockedStore = { dispatch: dispatchSpy, getState: () => state }

      // Create Drizzle and simulate web3 resolution
      drizzle = new Drizzle(drizzleOptions, mockedStore)
      drizzle.web3 = mockedWeb3
    })

    describe('Construction', () => {
      test('fires up drizzle store', () => {
        const expectedAction = {type: 'DRIZZLE_INITIALIZING', drizzle, options: drizzleOptions}
        expect(dispatchSpy).toHaveBeenCalledWith(expectedAction)
      })
    })

    describe('can add:', () => {
      test('Web3 Contracts', () => {
        const web3Contract = {}
        const contractConfig = { web3Contract }

        drizzle.addContract(contractConfig)

        expect(drizzle.contractList).toHaveLength(1)
        expect(DrizzleContract).toHaveBeenCalled()
      })

      test('TruffleArtifact Contracts', async () => {
        const { truffleArtifact } = await getWeb3Assets()
        drizzle.addContract(truffleArtifact)

        expect(drizzle.contractList).toHaveLength(1)
        expect(DrizzleContract).toHaveBeenCalled()
      })
    })
  })
})
