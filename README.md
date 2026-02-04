1| # Cognitive Space
2| 
3| Cognitive Space is a web application designed to help users organize and explore their thoughts, questions, and ideas. It allows you to drop unstructured thoughts, promote them into structured questions, and build context with claims, evidence, and triggers. Visualize connections between questions to uncover emerging patterns.
4| 
5| Built with React for the frontend and deployed as a Cloudflare Worker for the backend API.
6| 
7| ## Features
8| 
9| - **Thought Capture**: Quickly jot down ideas without structure.
10| - **Question Organization**: Promote thoughts into questions and add supporting elements.
11| - **Visualization**: Explore relationships between questions graphically.
12| - **Dark Matter Recovery**: Rescue orphaned thoughts and link them back.
13| - **PWA Support**: Installable as a progressive web app.
14| 
15| ## Guide
16| 
17| 1. Open the app and use `Just write` to drop a thought without worrying about structure.
18| 2. Create a new Question by tagging or promoting a thought when the theme becomes clear.
19| 3. Add supporting notes as Claims, Evidence, or Triggers to build context over time.
20| 4. Use `Visualize` to explore related questions and spot emerging clusters.
21| 5. Visit `Dark Matter` to rescue orphaned fragments and link them to a question.
22| 
23| For more details, see [Product Design](docs/product_design.md) and [Visualization Proposal](docs/visualization_proposal.md).
24| 
25| ## Prerequisites
26| 
27| - Node.js (version 16 or higher)
28| - Cloudflare Wrangler CLI (`npm install -g wrangler`)
29| 
30| ## Installation
31| 
32| 1. Clone the repository:
33|    ```bash
34|    git clone https://github.com/mingzhangyang/cognitive-space
35|    cd cognitive-space
36|    ```
37| 
38| 2. Install dependencies:
39|    ```bash
40|    npm install
41|    ```
42| 
43| ## Local Development
44| 
45| 1. Set the `BIGMODEL_API_KEY` secret using Wrangler:
46|    ```bash
47|    wrangler secret put BIGMODEL_API_KEY
48|    ```
49| 
50| 2. Run the Worker locally (builds assets first):
51|    ```bash
52|    npm run dev
53|    ```
54| 
55| 3. Optional: Run UI-only dev server (no Worker API):
56|    ```bash
57|    npm run dev:ui
58|    ```
59| 
60| ## Deployment
61| 
62| 1. Build the static assets:
63|    ```bash
64|    npm run build
65|    ```
66| 
67| 2. Deploy the Worker:
68|    ```bash
69|    npm run deploy
70|    ```
71| 
72| ## Configuration
73| 
74| - `BIGMODEL_API_KEY`: Required. Your API key for the AI model.
75| - `BIGMODEL_MODEL`: Optional. Defaults to `glm-4.5-flash`. Specify a different model if needed.
76| 
77| ## Scripts
78| 
79| - `npm run build`: Builds the static assets.
80| - `npm run dev`: Runs the Worker locally.
81| - `npm run dev:ui`: Runs the UI dev server.
82| - `npm run deploy`: Deploys to Cloudflare.
83| 
84| ## Contributing
85| 
86| Contributions are welcome! Please read the contributing guidelines (if any) before submitting a pull request.
87| 
88| ## License
89| 
90| This project is licensed under the MIT License.
91| 