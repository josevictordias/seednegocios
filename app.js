const inputData = document.querySelector("#inputData");
const apiKeyInput = document.querySelector("#apiKey");
const modelInput = document.querySelector("#model");
const generateButton = document.querySelector("#generateButton");
const clearButton = document.querySelector("#clearButton");
const output = document.querySelector("#output");
const status = document.querySelector("#status");

const setStatus = (message, tone = "info") => {
  status.textContent = message;
  status.dataset.tone = tone;
};

const buildPrompt = (data) => {
  return `Você é um analista de marketing. Gere um relatório simples em português (pt-BR) com base nos dados absolutos abaixo.\n\nRegras:\n- Replique cada linha com a métrica, mantendo os nomes informados.\n- Para cada etapa, calcule a porcentagem em relação à etapa anterior, quando fizer sentido.\n- Se houver moeda, use o formato R$ 0,00.\n- No final, inclua um insight rápido em uma frase curta.\n\nDados absolutos:\n${data}`;
};

const callOpenAI = async ({ apiKey, model, data }) => {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "Você é um assistente que gera relatórios de marketing curtos e objetivos.",
        },
        {
          role: "user",
          content: buildPrompt(data),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Erro ${response.status}: ${errorBody}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Resposta vazia da API.");
  }

  return content.trim();
};

generateButton.addEventListener("click", async () => {
  const data = inputData.value.trim();
  const apiKey = apiKeyInput.value.trim();
  const model = modelInput.value.trim() || "gpt-4o-mini";

  if (!data) {
    setStatus("Insira os dados absolutos antes de gerar o relatório.", "warning");
    output.textContent = "";
    return;
  }

  if (!apiKey) {
    setStatus("Informe sua chave da OpenAI para gerar o relatório.", "warning");
    output.textContent =
      "Para proteger sua chave, ela não fica salva. Insira a chave e tente novamente.";
    return;
  }

  setStatus("Gerando relatório com IA...", "loading");
  generateButton.disabled = true;

  try {
    const report = await callOpenAI({ apiKey, model, data });
    output.textContent = report;
    setStatus("Relatório gerado com sucesso!", "success");
  } catch (error) {
    setStatus("Não foi possível gerar o relatório.", "error");
    output.textContent = error.message;
  } finally {
    generateButton.disabled = false;
  }
});

clearButton.addEventListener("click", () => {
  inputData.value = "";
  output.textContent = "Seu relatório aparecerá aqui.";
  setStatus("Pronto para gerar seu relatório.", "info");
});
