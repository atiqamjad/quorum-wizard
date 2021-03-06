import {
  disableIfWrongJavaVersion,
  validateNetworkId,
  validateNumberStringInRange,
  validatePathLength,
} from './validators'
import { isJava11Plus } from '../utils/execUtils'
import { getOutputPath } from '../utils/fileUtils'
import { TEST_CWD } from '../utils/testHelper'

jest.mock('../utils/execUtils')
jest.mock('../utils/fileUtils')

getOutputPath.mockReturnValue(TEST_CWD)

test('accepts answer bottom of range', () => {
  expect(validateNumberStringInRange('2', 2, 3)).toBe(true)
})

test('accepts answer top of range', () => {
  expect(validateNumberStringInRange('3', 2, 3)).toBe(true)
})

test('rejects answer outside of range', () => {
  expect(validateNumberStringInRange('1', 2, 3))
    .toEqual('Number must be between 2 and 3 (inclusive)')
})

test('rejects answer that is not a number string', () => {
  expect(validateNumberStringInRange('on', 2, 3))
    .toEqual('Number must be between 2 and 3 (inclusive)')
})

test('allows network id that is not 1', () => {
  expect(validateNetworkId('0')).toEqual(true)
  expect(validateNetworkId('2')).toEqual(true)
  expect(validateNetworkId('10')).toEqual(true)
  expect(validateNetworkId('19283847')).toEqual(true)
})

test('rejects network id of 1', () => {
  expect(validateNetworkId('1'))
    .toEqual('Ethereum Mainnet has a network id of 1. Please choose another id')
})

test('rejects network id of less than 0', () => {
  expect(validateNetworkId('-1')).toEqual('Network ID must be positive')
})

test('rejects network id that is not a number', () => {
  expect(validateNetworkId('n')).toEqual('Network ID must be a number')
})

test('Disables java choices based on java version', () => {
  isJava11Plus.mockReturnValue(true)
  expect(disableIfWrongJavaVersion({ type: 'jar' })).toEqual(false)
  isJava11Plus.mockReturnValue(false)
  expect(disableIfWrongJavaVersion({ type: 'jar' })).toEqual('Disabled, requires Java 11+')
})

test('Validates network name and path length', () => {
  expect(validatePathLength('', 'bash')).toEqual('Network name must not be blank.')
  expect(validatePathLength('valid_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'bash'))
    .toEqual(true)
  expect(validatePathLength('invalid_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'bash'))
    .toEqual('The full path to your network folder is 1 character(s) too long. Please choose a shorter name or re-run the wizard in a different folder with a shorter path.')
  expect(validatePathLength('invalid_but_is_docker_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'docker-compose'))
    .toEqual(true)
})
