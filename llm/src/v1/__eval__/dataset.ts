import "dotenv/config";
import { Client } from "langsmith";

async function createDataset() {
    const client = new Client();
    const dataset = await client.createDataset("lemon-law-eval-dataset", {
        description: "Lemon Law Evaluation Dataset",
    });

    // Create inputs and reference outputs
    const examples = [
        {
            inputs: { input: "a client, whose car is Nissan, 4 times of repair, it's still within the warranty" },
            outputs: { output: `Congratulations! Your Nissan qualifies for lemon law protection. 
Next steps would typically involve gathering all relevant documentation, such as repair orders and warranty information, and possibly contacting a lemon law attorney to assist you in the process. If you have any further questions or need assistance with the next steps, feel free to ask!`
            },
            dataset_id: dataset.id,
        },
    ];

    // Add examples to the dataset
    await client.createExamples(examples);
}

createDataset().catch(console.error);