import crypto from "crypto";
function getApiConfig() {
    const url = process.env.SERVER_B_API_URL;
    const key = process.env.SERVER_B_API_KEY;
    if (!url) {
        throw new Error("SERVER_B_API_URL environment variable is not set");
    }
    if (!key) {
        throw new Error("SERVER_B_API_KEY environment variable is not set");
    }
    return { url, key };
}
function hmacSign(timestamp, secret) {
    return crypto.createHmac("sha256", secret).update(timestamp).digest("hex");
}
async function makeRequest(method, path, body) {
    const { url, key } = getApiConfig();
    const timestamp = Date.now().toString();
    const signature = hmacSign(timestamp, key);
    const headers = {
        "Content-Type": "application/json",
        "X-Timestamp": timestamp,
        "X-Signature": signature,
    };
    const response = await fetch(`${url}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server B API error: ${response.status} ${response.statusText} - ${text}`);
    }
    return response;
}
export async function provisionInstance(opts) {
    const response = await makeRequest("POST", "/api/provision", opts);
    return response.json();
}
export async function deprovisionInstance(instanceId) {
    await makeRequest("POST", "/api/deprovision", { instanceId });
}
export async function getInstanceStatus(instanceId) {
    try {
        const response = await makeRequest("GET", `/api/instances/${instanceId}`);
        return response.json();
    }
    catch (error) {
        if (error.message?.includes("404")) {
            return null;
        }
        throw error;
    }
}
export async function updateInstanceApiKey(instanceId, provider, apiKey) {
    await makeRequest("POST", `/api/instances/${instanceId}/config`, {
        provider,
        apiKey,
    });
}
//# sourceMappingURL=provisioning.js.map