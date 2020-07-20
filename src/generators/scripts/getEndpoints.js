import { addScriptExtension, scriptHeader, validateNodeNumberInput } from './utils'
import { isWin32 } from '../../utils/execUtils'
import { isKubernetes } from '../../model/NetworkConfig'

export default {
  filename: addScriptExtension('getEndpoints'),
  executable: true,
  generate: (config) => {
    if (!isKubernetes(config.network.deployment)) {
      throw new Error('getEndpoints script only used for Kubernetes deployments')
    }
    return endpointScriptKubernetes(config)
  },
}

export function endpointScriptKubernetes(config) {
  return isWin32() ? endpointScriptKubernetesWindows(config) : endpointScriptKubernetesBash(config)
}

function endpointScriptKubernetesBash(config) {
  return `${scriptHeader()}
${validateNodeNumberInput(config)}

IP_ADDRESS=$(minikube ip 2>/dev/null || echo localhost)

QUORUM_PORT=$(kubectl get service quorum-node$1 -o=jsonpath='{range.spec.ports[?(@.name=="rpc-listener")]}{.nodePort}')

TESSERA_PORT=$(kubectl get service quorum-node$1 -o=jsonpath='{range.spec.ports[?(@.name=="tm-tessera-third-part")]}{.nodePort}')

echo quorum rpc: http://$IP_ADDRESS:$QUORUM_PORT
echo tessera 3rd party: http://$IP_ADDRESS:$TESSERA_PORT
`
}

function endpointScriptKubernetesWindows(config) {
  return `${scriptHeader()}
${validateNodeNumberInput(config)}

FOR /f "delims=" %%g IN ('minikube ip 2^>nul ^|^| echo localhost') DO set IP_ADDRESS=%%g

FOR /F "tokens=* USEBACKQ" %%g IN (\`kubectl get service quorum-node%NODE_NUMBER% -o^=jsonpath^="{range.spec.ports[?(@.name=='rpc-listener')]}{.nodePort}"\`) DO set QUORUM_PORT=%%g

FOR /F "tokens=* USEBACKQ" %%g IN (\`kubectl get service quorum-node%NODE_NUMBER% -o^=jsonpath^="{range.spec.ports[?(@.name=='tm-tessera-third-part')]}{.nodePort}"\`) DO set TESSERA_PORT=%%g

echo quorum rpc: http://%IP_ADDRESS%:%QUORUM_PORT%
echo tessera 3rd party: http://%IP_ADDRESS%:%TESSERA_PORT%`
}
