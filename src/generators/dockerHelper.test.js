import { getFullNetworkPath } from './networkCreator'
import {
  createConfigFromAnswers,
} from '../model/NetworkConfig'
import {
  cwd,
  formatNewLine,
  libRootDir,
  readFileToString,
  writeFile,
} from '../utils/fileUtils'
import {
  buildDockerCompose,
  initDockerCompose,
} from './dockerHelper'
import {
  TEST_CWD,
  TEST_LIB_ROOT_DIR,
} from '../utils/testHelper'
import { info } from '../utils/log'
import { joinPath } from '../utils/pathUtils'
import { LATEST_CAKESHOP, LATEST_QUORUM, LATEST_TESSERA } from './download'

jest.mock('../utils/fileUtils')
jest.mock('../generators/networkCreator')
jest.mock('../utils/log')

cwd.mockReturnValue(TEST_CWD)
libRootDir.mockReturnValue(TEST_LIB_ROOT_DIR)
getFullNetworkPath.mockReturnValue(`${TEST_CWD}/test-network`)
info.mockReturnValue('log')

const baseNetwork = {
  numberNodes: '5',
  consensus: 'raft',
  quorumVersion: LATEST_QUORUM,
  transactionManager: LATEST_TESSERA,
  cakeshop: LATEST_CAKESHOP,
  deployment: 'docker-compose',
  containerPorts: {
    dockerSubnet: '172.16.239.0/24',
    quorum: {
      rpcPort: 8545,
      p2pPort: 21000,
      raftPort: 50400,
      wsPort: 8645,
      graphQlPort: 8547,
    },
    tm: {
      p2pPort: 9000,
      thirdPartyPort: 9080,
    },
  },
}

describe('generates docker-compose directory', () => {
  it('given docker details builds files to run docker', async () => {
    const config = createConfigFromAnswers(baseNetwork)

    readFileToString.mockReturnValueOnce('test')
    await initDockerCompose(config)

    expect(writeFile).toBeCalledWith(
      joinPath(getFullNetworkPath(), 'qdata', 'cakeshop', 'local', 'application.properties'),
      expect.anything(),
      false,
    )

    expect(writeFile).toBeCalledWith(
      joinPath(getFullNetworkPath(), 'docker-compose.yml'),
      expect.anything(),
      false,
    )

    expect(writeFile).toBeCalledWith(
      joinPath(getFullNetworkPath(), '.env'),
      expect.anything(),
      false,
    )
  })
  it('given docker details builds files to run docker', async () => {
    const config = createConfigFromAnswers({
      ...baseNetwork,
      cakeshop: 'none',
      transactionManager: 'none',
    })

    readFileToString.mockReturnValueOnce('test')
    await initDockerCompose(config)

    expect(writeFile).toBeCalledWith(
      joinPath(getFullNetworkPath(), 'docker-compose.yml'),
      expect.anything(),
      false,
    )

    expect(writeFile).toBeCalledWith(
      joinPath(getFullNetworkPath(), '.env'),
      expect.anything(),
      false,
    )
  })
})

describe('generates docker-compose script details', () => {
  it('creates docker-compose script with quorum and tessera', () => {
    const config = createConfigFromAnswers({
      ...baseNetwork,
      numberNodes: '1',
      cakeshop: 'none',
    })
    const services = `
services:
  node1:
    << : *quorum-def
    hostname: node1
    ports:
      - "22000:8545"
      - "23000:8645"
      - "24000:8547"
    volumes:
      - 1-nodes-raft-tessera-docker-compose-vol1:/qdata
      - ./qdata:/examples:ro
    depends_on:
      - txmanager1
    environment:
      - PRIVATE_CONFIG=/qdata/tm/tm.ipc
      - NODE_ID=1
    networks:
      1-nodes-raft-tessera-docker-compose-net:
        ipv4_address: 172.16.239.11
  txmanager1:
    << : *tx-manager-def
    hostname: txmanager1
    ports:
      - "9081:9080"
    volumes:
      - 1-nodes-raft-tessera-docker-compose-vol1:/qdata
      - ./qdata:/examples:ro
    networks:
      1-nodes-raft-tessera-docker-compose-net:
        ipv4_address: 172.16.239.101
    environment:
      - NODE_ID=1
networks:
  1-nodes-raft-tessera-docker-compose-net:
    name: 1-nodes-raft-tessera-docker-compose-net
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.16.239.0/24
volumes:
  "1-nodes-raft-tessera-docker-compose-vol1":
  "1-nodes-raft-tessera-docker-compose-cakeshopvol":`
    const expected = `quorumDefinitions\ntesseraDefinitions${services}`

    readFileToString.mockReturnValueOnce('definitions')
    readFileToString.mockReturnValueOnce('tessera')
    formatNewLine.mockReturnValueOnce('quorumDefinitions\n')
    formatNewLine.mockReturnValueOnce('tesseraDefinitions\n')

    expect(buildDockerCompose(config)).toEqual(expected)
  })

  it('creates docker-compose script just quorum', () => {
    const config = createConfigFromAnswers({
      ...baseNetwork,
      numberNodes: '1',
      transactionManager: 'none',
      cakeshop: 'none',
      consensus: 'istanbul',
    })
    const services = `
services:
  node1:
    << : *quorum-def
    hostname: node1
    ports:
      - "22000:8545"
      - "23000:8645"
      - "24000:8547"
    volumes:
      - 1-nodes-istanbul-docker-compose-vol1:/qdata
      - ./qdata:/examples:ro
    environment:
      - PRIVATE_CONFIG=ignore
      - NODE_ID=1
    networks:
      1-nodes-istanbul-docker-compose-net:
        ipv4_address: 172.16.239.11
networks:
  1-nodes-istanbul-docker-compose-net:
    name: 1-nodes-istanbul-docker-compose-net
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.16.239.0/24
volumes:
  "1-nodes-istanbul-docker-compose-vol1":
  "1-nodes-istanbul-docker-compose-cakeshopvol":`
    const expected = `quorumDefinitions${services}`

    readFileToString.mockReturnValueOnce('definitions')
    formatNewLine.mockReturnValueOnce('quorumDefinitions\n')

    expect(buildDockerCompose(config)).toEqual(expected)
  })

  it('creates docker-compose script with quorum and cakeshop', () => {
    const config = createConfigFromAnswers({
      ...baseNetwork,
      numberNodes: '1',
      transactionManager: 'none',
    })
    const services = `
services:
  node1:
    << : *quorum-def
    hostname: node1
    ports:
      - "22000:8545"
      - "23000:8645"
      - "24000:8547"
    volumes:
      - 1-nodes-raft-docker-compose-vol1:/qdata
      - ./qdata:/examples:ro
    environment:
      - PRIVATE_CONFIG=ignore
      - NODE_ID=1
    networks:
      1-nodes-raft-docker-compose-net:
        ipv4_address: 172.16.239.11
  cakeshop:
    << : *cakeshop-def
    hostname: cakeshop
    ports:
      - "8999:8999"
    volumes:
      - 1-nodes-raft-docker-compose-cakeshopvol:/qdata
      - ./qdata:/examples:ro
    networks:
      1-nodes-raft-docker-compose-net:
        ipv4_address: 172.16.239.2
networks:
  1-nodes-raft-docker-compose-net:
    name: 1-nodes-raft-docker-compose-net
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.16.239.0/24
volumes:
  "1-nodes-raft-docker-compose-vol1":
  "1-nodes-raft-docker-compose-cakeshopvol":`
    const expected = `quorumDefinitions\ncakeshopDefinitions${services}`

    readFileToString.mockReturnValueOnce('quorumDefinitions')
    readFileToString.mockReturnValueOnce('cakeshopDefinitions')
    formatNewLine.mockReturnValueOnce('quorumDefinitions\n')
    formatNewLine.mockReturnValueOnce('cakeshopDefinitions\n')

    expect(buildDockerCompose(config)).toEqual(expected)
  })

  it('creates docker-compose script with quorum, tessera and cakeshop', () => {
    const config = createConfigFromAnswers({
      ...baseNetwork,
      numberNodes: '1',
    })
    const services = `
services:
  node1:
    << : *quorum-def
    hostname: node1
    ports:
      - "22000:8545"
      - "23000:8645"
      - "24000:8547"
    volumes:
      - 1-nodes-raft-tessera-docker-compose-vol1:/qdata
      - ./qdata:/examples:ro
    depends_on:
      - txmanager1
    environment:
      - PRIVATE_CONFIG=/qdata/tm/tm.ipc
      - NODE_ID=1
    networks:
      1-nodes-raft-tessera-docker-compose-net:
        ipv4_address: 172.16.239.11
  txmanager1:
    << : *tx-manager-def
    hostname: txmanager1
    ports:
      - "9081:9080"
    volumes:
      - 1-nodes-raft-tessera-docker-compose-vol1:/qdata
      - ./qdata:/examples:ro
    networks:
      1-nodes-raft-tessera-docker-compose-net:
        ipv4_address: 172.16.239.101
    environment:
      - NODE_ID=1
  cakeshop:
    << : *cakeshop-def
    hostname: cakeshop
    ports:
      - "8999:8999"
    volumes:
      - 1-nodes-raft-tessera-docker-compose-cakeshopvol:/qdata
      - ./qdata:/examples:ro
    networks:
      1-nodes-raft-tessera-docker-compose-net:
        ipv4_address: 172.16.239.2
networks:
  1-nodes-raft-tessera-docker-compose-net:
    name: 1-nodes-raft-tessera-docker-compose-net
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.16.239.0/24
volumes:
  "1-nodes-raft-tessera-docker-compose-vol1":
  "1-nodes-raft-tessera-docker-compose-cakeshopvol":`
    const expected = `quorumDefinitions\ntesseraDefinitions\ncakeshopDefinitions${services}`

    readFileToString.mockReturnValueOnce('definitions')
    readFileToString.mockReturnValueOnce('tessera')
    readFileToString.mockReturnValueOnce('cakeshop')
    formatNewLine.mockReturnValueOnce('quorumDefinitions\n')
    formatNewLine.mockReturnValueOnce('tesseraDefinitions\n')
    formatNewLine.mockReturnValueOnce('cakeshopDefinitions\n')

    expect(buildDockerCompose(config)).toEqual(expected)
  })
})
