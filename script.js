const inputBox = document.getElementById('input-box');
const spinner = document.createElement('div');
spinner.id = 'loading-spinner';
spinner.innerHTML = `<svg width="25" height="25" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg" class="motion-safe:animate-spin icon-lg"><path d="M9.5 2.9375V5.5625M9.5 13.4375V16.0625M2.9375 9.5H5.5625M13.4375 9.5H16.0625" stroke="currentColor" stroke-width="1.875" stroke-linecap="round"></path><path d="M4.86011 4.85961L6.71627 6.71577M12.2847 12.2842L14.1409 14.1404M4.86011 14.1404L6.71627 12.2842M12.2847 6.71577L14.1409 4.85961" stroke="currentColor" stroke-width="1.875" stroke-linecap="round"></path></svg>`; // your spinner SVG here
const chatArea = document.getElementById('chatarea-container');

function addChatMessage(message) {
    var newChatDiv = document.createElement('div');
    newChatDiv.className = 'chat';				// simple function to append a new div in the chat area with the message content
    newChatDiv.innerText = message;
    chatArea.appendChild(newChatDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
    inputBox.style.height = 'auto';
    inputBox.value = '';
}
document.getElementById("send").addEventListener('click', function() {
    if (document.querySelector('#chatarea-attract').style.display){
        console.log('checked')
        document.querySelector('#chatarea-attract').style.display = "none"
        document.querySelector('#chatarea-container').style.display = "flex"
    }
    var message = inputBox.value;
    if (message === ""){
        console.log("Error: Blank Field");
    }
    else {
        addChatMessage(message)
        chatArea.appendChild(spinner)
        async function sendPrompt() {
            const MODEL_ID = "openai/gpt-oss-20b:free";

            const messagePrompt = `**Role**
            You are a personal medical assistant with years of knowledge on guiding patients and providing diagnoses and recommending over-the-counter medications and home remedies that usually do not require a prescription
            
            **Task**
            Your task is to listen to the query provided for symptoms, list them, analyze them and provide me a concise diagnosis of probable causes based on your understanding.
            If the symptoms link to multiple possible outcomes, list each one of them with how likely they are to occur
            If it is a bigger issue, then suggest me the particular kind of doctor I need to consult for the issue.
            If it is an issue which can be addressed with medicines or home remedies, suggest me those remedies.
            If it is a question or a query not related to medicine or medical-related, strictly refuse to answer it, and tell me that you cannot answer it as you are a strictly a medical assistant and do not entertain requests except for medicine related.
            
            **Query**
            ${message}`

            try {
                const response = await fetch("https://openrouter.panacea-ai-24.workers.dev/", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: MODEL_ID,
                        messages: [{ role: "user", content: messagePrompt }],
                        stream: true
                    })
                });
        
                if (!response.ok) {
                    throw new Error("API error: " + response.status);
                }
        
                const newChatDiv = document.createElement('div');
                newChatDiv.className = 'ai-chat';
                chatArea.appendChild(newChatDiv);
                chatArea.scrollTop = chatArea.scrollHeight;
                const reader = response.body.getReader();
                const decoder = new TextDecoder("utf-8");
                let done = false;
                let firstChunk = true;
                let buffer = ""
                let accumulatedText = "";
        
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                
                    buffer += decoder.decode(value, { stream: true });
                    const parts = buffer.split("\n\n");
                    buffer = parts.pop(); // hold incomplete chunk
                
                    for (const part of parts) {
                      if (part.startsWith("data: ")) {
                        const data = part.slice(6).trim();
                
                        if (data === "[DONE]") {
                          spinner?.remove();
                          return;
                        }
                
                        try {
                          const json = JSON.parse(data);
                          const delta = json.choices?.[0]?.delta?.content;
                          if (delta) {
                            if (firstChunk) {
                              spinner?.remove();
                              firstChunk = false;
                            }
                            accumulatedText += delta;
                            await new Promise(r => setTimeout(r, 50));
                            newChatDiv.innerHTML = marked.parse(accumulatedText);
                            chatArea.scrollTop = chatArea.scrollHeight;
                          }
                        } catch (err) {
                          console.warn("Parse error:", err);
                        }
                      }
                    }
                }
        
            } catch (error) {
                console.error("Error:", error);
            }
        }
        sendPrompt()
    }
})


