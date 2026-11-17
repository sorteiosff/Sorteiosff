# sorteiosff

Painel público inicial para acompanhar estatísticas e ranking de comentários de vídeos do YouTube.

## Requisitos
- Node.js 18 ou superior
- Projeto no Google Cloud com **YouTube Data API v3** ativada e uma chave de API
- Hospedagem Node.js que mantenha o processo ativo

## Rodar localmente
1. Instale Node.js.
2. Extraia o ZIP e abra um terminal nesta pasta.
3. Execute `npm install`.
4. Copie `.env.example` para `.env`.
5. Coloque sua chave em `YOUTUBE_API_KEY` e troque `ADMIN_PIN`.
6. Execute `npm start`.
7. Abra `http://localhost:3000`.

## Configurar a API do YouTube
No Google Cloud Console, crie um projeto, ative YouTube Data API v3 e crie uma chave de API. Restrinja a chave à API do YouTube e, quando possível, ao IP do servidor. **Nunca coloque a chave no HTML nem publique o arquivo .env.**

## Publicar
Publique como serviço Node.js em uma hospedagem compatível. Configure as variáveis `YOUTUBE_API_KEY` e `ADMIN_PIN` no painel da hospedagem. Use armazenamento persistente para manter `sorteiosff.db`. O servidor precisa permanecer ativo para executar o sorteio de domingo às 16h (fuso America/Sao_Paulo).

## Regras e limitações importantes
- O ranking considera comentários principais públicos, não respostas, e conta por canal do YouTube.
- A primeira versão analisa até 2.000 comentários principais por consulta para controlar consumo de cota. Se houver mais, o ranking pode estar incompleto.
- Se comentários estiverem desativados, privados, retidos ou inacessíveis pela API, não há como contar todos.
- Curtidas e visualizações são estatísticas públicas retornadas pela API; podem ter atraso.
- O sorteio automático escolhe aleatoriamente entre os participantes empatados com o maior número de comentários. Quem comenta mais não ganha automaticamente sem essa regra estar divulgada.
- O agendamento exige servidor ativo no domingo às 16h. Hospedagem que suspende o serviço pode perder o horário.
- A API pública não fornece uma lista de quem curtiu o vídeo.
- Antes de divulgar sorteios, publique regras claras: elegibilidade, prazo, prêmio, método de escolha, contato do ganhador e prevenção contra contas falsas.
- Este projeto é independente e não é afiliado ao YouTube ou à Garena.
