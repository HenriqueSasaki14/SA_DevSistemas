import { useState } from 'react'

function App() {
  const [numero, setNumero] = useState(0)

  return (
    <div>
      <h1>Meu projeto React</h1>
      <h2>{numero}</h2>

      <button onClick={() => setNumero(numero + 1)}>
        Clique
      </button>
    </div>
  )
}

export default App