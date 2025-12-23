import fetch from 'node-fetch';

const verify = async () => {
    try {
        console.log("Testing Generation Endpoint...");
        const response = await fetch('http://localhost:5174/api/generation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: "TEST_PROMPT",
                style_id: "style-1",
                model_config: { model: 'gpt-image-1.5', quality: 'high' }
            })
        });

        if (response.status === 200) {
            const data = await response.json();
            console.log("✅ SUCCESS: Endpoint returned 200");
            console.log("Response:", data);
        } else {
            console.log(`❌ FAILED: Endpoint returned ${response.status}`);
            console.log("Response Text:", await response.text());
        }
    } catch (error) {
        console.log("❌ ERROR: Connection failed. Is the server running?");
        console.log(error.message);
    }
};

verify();
