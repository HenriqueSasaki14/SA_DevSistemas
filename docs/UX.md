# Homologação de Usabilidade (UX/UI) e Padronização (Etapa 8 · Arquiteto)

## Padrões adotados

| Situação | Padrão | Componente |
| :-- | :-- | :-- |
| Operação concluída | **Toast** verde no canto inferior direito, some em 4 s | `ToastProvider` |
| Erro de operação | Toast vermelho (ou alerta dentro do modal, se for erro do formulário) | `ToastProvider`, `ModalTransacao` |
| Carregando pela 1ª vez | **Skeleton** no formato do conteúdo | `Skeleton` |
| Recarregando (filtro, página) | Conteúdo anterior fica esmaecido; não pisca | classe `.carregando` |
| Ação destrutiva | **Modal de confirmação** explicando o Soft Delete | `ModalExclusao` |
| Falha ao carregar | Mensagem + botão "Tentar novamente" | `HomePage` |
| Lista vazia | Mensagem diferente para "sem dados" e "nenhum resultado com esses filtros" | `TabelaTransacoes` |
| Valor em dinheiro | Máscara de maquininha: os dígitos entram pela direita, sem ambiguidade entre ponto e vírgula | `CampoMoeda` |
| Datas | `dd/mm/aaaa`, sem deslocamento de fuso | `utils/datas.js` |
| Cores | Verde = entrada, vermelho = saída, em todo o sistema (paleta validada para daltonismo, com legenda e rótulo de texto) | `index.css` |

## Checklist de homologação

| Item | Resultado |
| :-- | :-- |
| Layout sem rolagem lateral em 390 px (celular) | ✅ |
| Menu acessível no celular (Dashboard/Administração) | ✅ |
| Modais fecham com ESC e clique fora | ✅ |
| Botões de ícone têm `aria-label` | ✅ |
| Gráfico tem legenda, tooltip, navegação por teclado e visão em tabela | ✅ |
| Toasts anunciados para leitor de tela (`aria-live`) | ✅ |
| Mensagens de erro da API em português e específicas por campo | ✅ |
| Digitar `200000` no valor resulta em R$ 2.000,00, mesmo clicando no início do campo | ✅ (coberto por teste e2e) |
