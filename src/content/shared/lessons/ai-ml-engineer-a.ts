import type { Lesson } from "./types";

const base = { familyId: "data-ai", pathId: "ai-ml-engineer" } as const;

export const AI_ML_LESSONS_A: Lesson[] = [
  {
    ...base,
    id: "mle-repro-testing",
    module: "Python for ML engineering",
    title: "Reproducible, tested ML code",
    minutes: 40,
    objectives: ["Control randomness so two runs give the same result", "Keep configuration out of code and recorded with each run", "Write tests for ML code: determinism, shapes, invariants and a baseline"],
    explain: [
      "A model you cannot reproduce is a model you cannot trust, debug or improve. Reproducibility starts with controlling randomness. Random number generators appear in data splitting, weight initialisation, shuffling, dropout and sampling, so set the seed for each library you use and pass it through your code explicitly. Record everything else that affects results: the code version, the library versions, the data version and the configuration. Pin dependencies in a lock file so next month's install matches today's.",
      "Keep configuration separate from code. Hyperparameters, file paths and thresholds belong in a config file or a typed config object that is saved alongside each run's outputs. That makes experiments comparable and makes it possible to rerun an old result. Avoid editing constants inside notebooks, because the edit is invisible a week later. Version your data too: at minimum store a hash of the training file and its row count with the run, so you can tell when the data changed.",
      "ML code deserves tests, even though outputs are statistical. You can test determinism, because two runs with the same seed should match exactly. You can test shapes and types at function boundaries, invariants such as probabilities lying between zero and one and summing to one, and data checks such as no missing labels. A baseline test is powerful: assert that your model beats a trivial predictor by a meaningful margin, which catches broken pipelines that silently produce nonsense.",
      "Structure projects so tests are easy to write. Move logic out of notebooks into functions in a package, keep functions small and pure where possible, and use a small fixed dataset for fast tests. Run the tests in continuous integration on every change. Notebooks remain great for exploration, but once something matters, promote it to code that is reviewed, tested and reproducible.",
    ],
    keyIdeas: ["Seed every source of randomness and pass the seed explicitly", "Config and data hashes are saved with every run", "Test determinism, shapes, invariants and a baseline", "Move logic out of notebooks into tested functions"],
    example: {
      title: "A reproducible training function with tests",
      lang: "python",
      code: `import hashlib
import json
import random

import numpy as np
from sklearn.dummy import DummyClassifier
from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split

CONFIG = {"seed": 42, "test_size": 0.2, "C": 1.0, "n_samples": 2000}


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    # With PyTorch also call: torch.manual_seed(seed); torch.cuda.manual_seed_all(seed)


def load_data(config):
    X, y = make_classification(
        n_samples=config["n_samples"], n_features=10, n_informative=5,
        random_state=config["seed"],
    )
    return X, y


def train(config):
    set_seed(config["seed"])
    X, y = load_data(config)
    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=config["test_size"], stratify=y, random_state=config["seed"]
    )
    model = LogisticRegression(C=config["C"], max_iter=1000).fit(X_tr, y_tr)
    baseline = DummyClassifier(strategy="most_frequent").fit(X_tr, y_tr)
    return {
        "accuracy": accuracy_score(y_te, model.predict(X_te)),
        "baseline_accuracy": accuracy_score(y_te, baseline.predict(X_te)),
        "model": model,
        "X_te": X_te,
        "config_hash": hashlib.sha256(json.dumps(config, sort_keys=True).encode()).hexdigest()[:12],
    }


# ---- tests (run with: pytest this_file.py) ----
def test_runs_are_deterministic():
    a, b = train(CONFIG), train(CONFIG)
    assert a["accuracy"] == b["accuracy"]
    assert a["config_hash"] == b["config_hash"]


def test_probabilities_are_valid():
    out = train(CONFIG)
    proba = out["model"].predict_proba(out["X_te"])
    assert proba.shape == (len(out["X_te"]), 2)
    assert np.all((proba >= 0) & (proba <= 1))
    assert np.allclose(proba.sum(axis=1), 1.0)


def test_model_beats_baseline():
    out = train(CONFIG)
    assert out["accuracy"] > out["baseline_accuracy"] + 0.10


if __name__ == "__main__":
    r = train(CONFIG)
    print({k: v for k, v in r.items() if k in ("accuracy", "baseline_accuracy", "config_hash")})
    test_runs_are_deterministic(); test_probabilities_are_valid(); test_model_beats_baseline()
    print("all tests passed")`,
      walkthrough: ["The seed is set once from the config and passed to every library that uses randomness.", "The config hash is saved with the run, so you can tell later exactly which settings produced a result.", "The tests check determinism, valid probabilities and that the model beats a trivial baseline, which catches silent pipeline breakage."],
    },
    practice: [
      { task: "Take a notebook you have and move training into a function that takes a config. Add one determinism test.", hint: "If two runs differ, look for an unseeded split, shuffle or initialiser." },
      { task: "Add a data check that fails when labels contain missing values or when the row count changes unexpectedly.", hint: "Store the row count and a file hash in the run's output." },
    ],
    quiz: [
      { q: "Two runs with the same seed give different accuracy. What is the most likely cause?", options: ["The metric is wrong", "Some source of randomness is not seeded, such as a split or a shuffle", "The data is too small", "Python is slow"], answer: 1, why: "Every random component must be seeded or controlled for runs to match." },
      { q: "What does a 'beats the baseline' test protect against?", options: ["Slow training", "A pipeline that silently produces a model no better than guessing", "Memory leaks", "Syntax errors"], answer: 1, why: "It catches broken labels, leakage mistakes in the opposite direction and misconfigured training." },
      { q: "Why save a hash of the config with each run?", options: ["To compress the output", "To identify exactly which settings produced a result", "To speed up training", "To hide parameters"], answer: 1, why: "Hashes make runs comparable and traceable." },
    ],
    pitfalls: ["Editing constants in a notebook with no record", "Unpinned dependencies that change between runs", "Testing nothing because outputs are statistical"],
  },
  {
    ...base,
    id: "mle-training-loop",
    module: "Deep learning in practice",
    title: "The training loop: batches, loss, optimiser, evaluation",
    minutes: 40,
    objectives: ["Explain each step of a training loop", "Write a correct PyTorch loop with separate training and evaluation", "Avoid the classic mistakes: forgetting zero_grad, eval mode and no_grad"],
    explain: [
      "Training a neural network is a loop that repeats four steps. Take a batch of data and compute the model's predictions, which is the forward pass. Compare predictions with the true values using a loss function that returns one number measuring how wrong the model is. Compute the gradient of the loss with respect to every parameter, which is the backward pass. Then let the optimiser adjust each parameter a small step in the direction that reduces the loss.",
      "Working in batches rather than the whole dataset keeps memory manageable and adds helpful noise to the updates. One pass through the entire training set is an epoch. You usually shuffle the training data each epoch so the model does not learn the order. The learning rate controls the step size: too high and the loss bounces or explodes, too low and training crawls. Adam is a sensible default optimiser to start with.",
      "Evaluation needs different behaviour from training. Call model.eval() to switch off layers such as dropout and to make batch normalisation use its running statistics, and wrap evaluation in torch.no_grad() so no gradients are tracked, which saves memory and time. Switch back with model.train() before the next epoch. Track the training loss and a validation metric every epoch; the gap between them is your earliest signal of overfitting.",
      "Most training bugs are small. Forgetting optimizer.zero_grad() makes gradients accumulate across batches. Computing the loss on the wrong shape or with the wrong target type produces silent nonsense or errors. Leaving the model in training mode during evaluation gives noisy validation scores. Keep the loop short and explicit while you are learning, and only reach for higher-level training libraries when you understand what they automate.",
    ],
    keyIdeas: ["Forward, loss, backward, step: repeated per batch", "Shuffle training data; watch the learning rate", "eval() and no_grad() for validation, train() to resume", "Compare training and validation loss every epoch"],
    example: {
      title: "A complete regression training loop in PyTorch",
      lang: "python",
      code: `import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

torch.manual_seed(0)

# Synthetic data: y = X @ w + noise
X = torch.randn(1000, 10)
true_w = torch.randn(10, 1)
y = X @ true_w + 0.1 * torch.randn(1000, 1)

train_ds = TensorDataset(X[:800], y[:800])
val_ds = TensorDataset(X[800:], y[800:])
train_dl = DataLoader(train_ds, batch_size=64, shuffle=True)
val_dl = DataLoader(val_ds, batch_size=256)

model = nn.Sequential(nn.Linear(10, 32), nn.ReLU(), nn.Linear(32, 1))
loss_fn = nn.MSELoss()
optimizer = torch.optim.Adam(model.parameters(), lr=1e-2)

for epoch in range(15):
    model.train()
    train_loss = 0.0
    for xb, yb in train_dl:
        optimizer.zero_grad()              # clear gradients from the previous batch
        loss = loss_fn(model(xb), yb)      # forward pass and loss
        loss.backward()                    # backward pass: compute gradients
        optimizer.step()                   # update parameters
        train_loss += loss.item() * len(xb)

    model.eval()
    with torch.no_grad():                  # no gradient tracking during evaluation
        val_loss = sum(loss_fn(model(xb), yb).item() * len(xb) for xb, yb in val_dl)

    print(f"epoch {epoch + 1:2d}  train {train_loss / len(train_ds):.4f}  val {val_loss / len(val_ds):.4f}")`,
      walkthrough: ["zero_grad, forward, backward and step form the four-step core of each batch.", "model.eval() with torch.no_grad() makes validation deterministic and cheap, and model.train() is restored at the top of the next epoch.", "Printing the training and validation loss side by side shows whether the model is still learning or starting to overfit."],
    },
    practice: [
      { task: "Remove optimizer.zero_grad() from the loop and observe what happens to the loss. Explain why.", hint: "Gradients from earlier batches accumulate and corrupt each update." },
      { task: "Try learning rates of 1e-4, 1e-2 and 1.0 and describe each loss curve.", hint: "A very high rate often makes the loss bounce or become NaN; a very low one barely moves." },
    ],
    quiz: [
      { q: "What does optimizer.zero_grad() do?", options: ["Resets the model weights", "Clears gradients accumulated from previous batches", "Stops training", "Sets the learning rate to zero"], answer: 1, why: "PyTorch accumulates gradients by default, so you must clear them each step." },
      { q: "Why wrap validation in torch.no_grad()?", options: ["To change the loss", "To avoid tracking gradients, saving memory and time", "To enable dropout", "To shuffle the data"], answer: 1, why: "No gradients are needed for evaluation, and tracking them wastes resources." },
      { q: "Training loss keeps falling while validation loss starts rising. What does this indicate?", options: ["Underfitting", "Overfitting", "A bug in the optimiser", "Normal behaviour"], answer: 1, why: "The model is memorising the training data and no longer generalising." },
    ],
    pitfalls: ["Forgetting eval mode during validation", "Not shuffling the training data", "Changing several hyperparameters at once"],
  },
  {
    ...base,
    id: "mle-overfit-debug",
    module: "Deep learning in practice",
    title: "Overfitting, learning curves and a debugging checklist",
    minutes: 40,
    objectives: ["Read a learning curve and a validation curve", "Apply the main remedies for overfitting and underfitting", "Use a systematic checklist when a model will not train"],
    explain: [
      "A model overfits when it learns the quirks of the training data and does worse on new data. The signature is a large gap: training performance keeps improving while validation performance stalls or gets worse. Underfitting is the opposite: both scores are poor because the model is too simple, trained too briefly or starved of useful features. Plotting scores against model complexity, or against training set size, tells you which problem you have.",
      "A learning curve plots training and validation scores as the amount of training data grows. If the two curves converge at a poor score, more data will not help and the model needs more capacity or better features. If a large gap remains, more data, stronger regularisation or a simpler model should help. A validation curve plots scores against one hyperparameter, such as tree depth, and shows the sweet spot where validation peaks before it falls.",
      "Remedies follow from the diagnosis. For overfitting: get more or cleaner data, simplify the model, add regularisation such as weight decay or dropout, use early stopping, and augment the data. For underfitting: use a more expressive model, train longer, engineer better features and reduce regularisation. Always change one thing at a time and keep a record so you know what actually made a difference.",
      "When a network does not learn at all, use a checklist. Can it overfit a single small batch to near zero loss? If not, there is a bug in the model, the loss or the data pipeline. Check input and label shapes, that labels align with inputs, that data is normalised, the learning rate, that gradients are not zero or exploding and that the loss matches the task. Fix the pipeline first, then scale up.",
    ],
    keyIdeas: ["A large train-validation gap means overfitting", "Learning curves show whether data or capacity is the limit", "Change one thing at a time; keep a log", "Overfit one batch first to prove the pipeline works"],
    example: {
      title: "A validation curve: finding the sweet spot",
      lang: "python",
      code: `import numpy as np
from sklearn.datasets import make_classification
from sklearn.model_selection import validation_curve
from sklearn.tree import DecisionTreeClassifier

X, y = make_classification(
    n_samples=1500, n_features=20, n_informative=6, n_redundant=4,
    flip_y=0.1, random_state=0,          # 10% label noise makes overfitting visible
)

depths = np.arange(1, 16)
train_scores, val_scores = validation_curve(
    DecisionTreeClassifier(random_state=0), X, y,
    param_name="max_depth", param_range=depths, cv=5, scoring="accuracy",
)

for d, tr, va in zip(depths, train_scores.mean(axis=1), val_scores.mean(axis=1)):
    print(f"depth {d:2d}  train {tr:.3f}  validation {va:.3f}  gap {tr - va:+.3f}")

best = depths[val_scores.mean(axis=1).argmax()]
print("best depth by validation score:", best)`,
      walkthrough: ["Training accuracy rises steadily with depth, but validation accuracy peaks and then falls as the tree memorises noise.", "The widening gap column makes overfitting easy to see.", "Choosing the depth with the best validation score is a simple, principled way to regularise."],
    },
    practice: [
      { task: "Run the example and note the depth where validation peaks. Then increase the label noise and see how the best depth changes.", hint: "More noise usually favours a simpler model." },
      { task: "Write your own five-item debugging checklist for a network that will not train and use it on a model you have built.", hint: "Include 'overfit a single batch' as the first test." },
    ],
    quiz: [
      { q: "Training accuracy 99% and validation accuracy 70%. What is the likely problem?", options: ["Underfitting", "Overfitting", "A learning rate of zero", "Too little regularisation is impossible"], answer: 1, why: "A large gap between training and validation scores signals overfitting." },
      { q: "A model cannot reduce loss to near zero on a single small batch. What should you suspect?", options: ["It needs more data", "A bug in the model, loss, labels or data pipeline", "Too much regularisation only", "The GPU is slow"], answer: 1, why: "Any reasonable model can memorise one tiny batch, so failure points to a pipeline bug." },
      { q: "Both curves converge at a low score. What helps most?", options: ["More training data", "A more expressive model or better features", "Stronger regularisation", "Early stopping"], answer: 1, why: "The model is underfitting, so adding capacity or better inputs is the remedy." },
    ],
    pitfalls: ["Adding data when the model is underfitting", "Tuning on the test set", "Changing many things at once so nothing can be learned"],
  },
  {
    ...base,
    id: "mle-embeddings",
    module: "Embeddings and retrieval",
    title: "Embeddings and similarity search",
    minutes: 35,
    objectives: ["Explain what an embedding is and what similarity means", "Implement cosine-similarity search", "Know the limits of embedding search and when to combine it with keywords"],
    explain: [
      "An embedding turns a piece of data, such as a sentence, into a list of numbers, called a vector, so that similar items end up close together. A good text embedding model places 'How do I reset my password?' near 'I forgot my login credentials' even though they share few words. Similarity is usually measured with cosine similarity, which compares the direction of two vectors and ignores their length. If vectors are normalised to length one, cosine similarity is simply their dot product.",
      "Search then becomes simple. Embed every document once and store the vectors. At query time embed the question, compute its similarity with every stored vector and return the top results. For a few thousand documents, a plain matrix multiplication is fast enough. At millions of vectors you use an approximate nearest neighbour index, which trades a small loss in accuracy for large gains in speed.",
      "Embeddings capture meaning, not exact strings. They can miss precise identifiers, such as an error code or a product SKU, and can retrieve plausible but wrong passages. Keyword search methods such as BM25 are better at exact matches. Hybrid search combines both, then often re-ranks the combined top results with a more accurate but slower model. Always evaluate retrieval on real questions, because impressive demos can hide poor recall.",
      "Practical details matter. Use the same embedding model for documents and queries and never mix models, because their spaces are incompatible. Store the model name and version with the vectors, because changing models means re-embedding everything. Think about chunk size, which affects what each vector represents, and about metadata filters such as language or date to narrow results before similarity is computed.",
    ],
    keyIdeas: ["Embeddings place similar meanings close together", "Cosine similarity equals the dot product for normalised vectors", "Embeddings miss exact identifiers; consider hybrid search", "Same model for documents and queries; store the model version"],
    example: {
      title: "Similarity search with normalised vectors",
      lang: "python",
      code: `import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

docs = [
    "To reset your password, open Settings and choose Reset password.",
    "Our refund policy allows returns within 30 days of purchase.",
    "You can change your billing address from the Account page.",
    "If you forgot your login credentials, use the password reset link.",
]

# Stand-in for an embedding model: TF-IDF vectors. In production replace
# embed() with a call to a real embedding model; the search code stays the same.
vectorizer = TfidfVectorizer(stop_words="english").fit(docs)

def embed(texts):
    vectors = vectorizer.transform(texts).toarray()
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    return vectors / np.clip(norms, 1e-12, None)   # normalise to length 1

doc_vectors = embed(docs)                          # computed once and stored

def search(query, k=2):
    q = embed([query])[0]
    scores = doc_vectors @ q                       # cosine similarity = dot product here
    top = np.argsort(-scores)[:k]
    return [(float(scores[i]), docs[i]) for i in top]

for score, text in search("how do I reset my password"):
    print(f"{score:.2f}  {text}")`,
      walkthrough: ["Vectors are normalised once, so the dot product equals cosine similarity.", "Documents are embedded in advance; only the query is embedded at search time.", "Swapping the toy embed function for a real model changes nothing else in the search code."],
    },
    practice: [
      { task: "Add five more documents and write ten test questions with the document each should retrieve. Compute how often the right document is in the top 2.", hint: "That fraction is recall at 2." },
      { task: "Search for an exact identifier such as an error code and observe how well semantic or TF-IDF search handles it. Describe how hybrid search would help.", hint: "Exact tokens are the strength of keyword methods." },
    ],
    quiz: [
      { q: "For vectors normalised to length one, cosine similarity equals...", options: ["Their sum", "Their dot product", "Their difference", "Their length"], answer: 1, why: "With unit length, dividing by the norms changes nothing, so the dot product is the cosine." },
      { q: "Why must queries and documents use the same embedding model?", options: ["Licensing", "Different models produce incompatible vector spaces", "It saves disk", "It is faster"], answer: 1, why: "Similarity is only meaningful inside one model's space." },
      { q: "When is keyword search better than embedding search?", options: ["Never", "For exact identifiers like error codes or SKUs", "For long essays", "For synonyms"], answer: 1, why: "Keyword methods match exact tokens, which embeddings can blur." },
    ],
    pitfalls: ["Changing the embedding model without re-embedding documents", "Judging retrieval by a few impressive demos", "Ignoring metadata filters and exact-match needs"],
  },
  {
    ...base,
    id: "mle-rag",
    module: "Embeddings and retrieval",
    title: "RAG done properly: chunking, grounding, abstaining",
    minutes: 40,
    objectives: ["Chunk documents so each piece answers a question on its own", "Build a prompt that grounds the model in retrieved sources and cites them", "Make the system say 'I don't know' when retrieval fails"],
    explain: [
      "Retrieval-augmented generation, or RAG, gives a language model relevant text at question time, so it can answer from your documents instead of from memory. The system retrieves the passages most relevant to the question, places them in the prompt with clear instructions, and asks the model to answer using only that context. Done well it reduces made-up answers and lets you update knowledge by changing documents, not retraining a model.",
      "Chunking decides what the retriever can find. Chunks that are too large dilute meaning and waste context; chunks that are too small lose the surrounding explanation. A common starting point is a few hundred words with some overlap between neighbours so a sentence cut at a boundary is still found. Better still, split on natural structure such as headings and paragraphs, and attach metadata like the document title, section and date so you can cite and filter.",
      "Grounding is about the prompt and the contract. Number each retrieved source and tell the model to answer only from them, cite the source numbers it used, and say it cannot answer if the sources do not contain the information. The abstain rule matters: if the best retrieval score is low, do not even call the model; return a message that nothing relevant was found. A confident wrong answer is worse than an honest refusal.",
      "Measure retrieval and generation separately. For retrieval, build a set of real questions with the passage that answers each and compute recall at k. For generation, check that answers are supported by the cited sources and that unanswerable questions get a refusal. Most RAG failures are retrieval failures, so fix chunking, filters and ranking before changing the model or prompt.",
    ],
    keyIdeas: ["Chunk on structure with overlap, and keep metadata", "Number sources, require citations, allow refusal", "Abstain when retrieval confidence is low", "Evaluate retrieval (recall at k) separately from generation"],
    example: {
      title: "Chunking, retrieval, a grounded prompt and an abstain rule",
      lang: "python",
      code: `import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer


def chunk_words(text, size=60, overlap=15):
    words = text.split()
    step = size - overlap
    return [" ".join(words[i:i + size]) for i in range(0, max(len(words) - overlap, 1), step)]


documents = {
    "Refund policy": "Customers may return items within 30 days of delivery for a full refund. "
                     "Refunds are issued to the original payment method within 5 business days. "
                     "Items must be unused and in their original packaging.",
    "Shipping": "Standard shipping takes 3 to 5 business days. Express shipping takes 1 to 2 business days "
                "and costs extra. Orders above 999 rupees ship free.",
}

chunks, meta = [], []
for title, body in documents.items():
    for piece in chunk_words(body, size=25, overlap=5):
        chunks.append(piece)
        meta.append(title)

vec = TfidfVectorizer(stop_words="english").fit(chunks)
matrix = vec.transform(chunks)


def retrieve(question, k=2):
    scores = (matrix @ vec.transform([question]).T).toarray().ravel()
    top = np.argsort(-scores)[:k]
    return [(float(scores[i]), meta[i], chunks[i]) for i in top]


def build_prompt(question, min_score=0.15):
    hits = retrieve(question)
    if not hits or hits[0][0] < min_score:
        return None                                # abstain: do not call the model at all
    sources = "\\n".join(f"[{i + 1}] ({m}) {t}" for i, (_, m, t) in enumerate(hits))
    return (
        "Answer the question using ONLY the numbered sources. Cite sources like [1]. "
        "If the sources do not contain the answer, reply exactly: I don't know.\\n\\n"
        f"Sources:\\n{sources}\\n\\nQuestion: {question}\\nAnswer:"
    )


print(build_prompt("How long do refunds take?"))
print(build_prompt("What is the CEO's favourite colour?"))   # None -> return 'I don't know'`,
      walkthrough: ["Chunks overlap slightly and keep their document title as metadata for citations.", "The prompt numbers the sources and requires citations and an explicit refusal when the answer is missing.", "A low retrieval score short-circuits the pipeline, so the system declines instead of guessing."],
    },
    practice: [
      { task: "Write 15 questions about a set of documents, including 3 that the documents cannot answer. Measure recall at 3 and the refusal rate on the unanswerable ones.", hint: "Label the correct chunk for each answerable question." },
      { task: "Vary chunk size between 40, 120 and 300 words and compare recall at 3. Describe the trade-off you observe.", hint: "Large chunks dilute relevance; small chunks lose context." },
    ],
    quiz: [
      { q: "What should a RAG system do when retrieval returns only weak matches?", options: ["Guess anyway", "Abstain or say it does not know", "Retrieve more chunks forever", "Increase the model size"], answer: 1, why: "An honest refusal is better than a confident answer without evidence." },
      { q: "Why add overlap between chunks?", options: ["To use more storage", "So a fact cut at a chunk boundary is still retrievable", "To speed up embedding", "To avoid metadata"], answer: 1, why: "Overlap preserves context across boundaries." },
      { q: "Most RAG failures are usually...", options: ["Model failures", "Retrieval failures", "Network failures", "UI failures"], answer: 1, why: "If the right passage is not retrieved, no prompt can recover it, so fix retrieval first." },
    ],
    pitfalls: ["Evaluating only the final answer and never retrieval", "Stuffing too many chunks into the prompt", "No refusal path for unanswerable questions"],
  },
  {
    ...base,
    id: "mle-structured",
    module: "LLM applications",
    title: "Structured outputs and tool use",
    minutes: 35,
    objectives: ["Request machine-readable output and validate it", "Retry with error feedback when validation fails", "Design tools the model can call safely"],
    explain: [
      "Language models produce text, but your software needs data. The reliable pattern is to ask for output in a defined structure, usually JSON, and validate it against a schema before using it. Treat the model's output like input from an untrusted user: parse it, check types and ranges, reject anything that does not fit, and never pass raw text straight into a database query or a command. Many providers also offer structured-output or function-calling modes that constrain the response to a schema, which reduces but does not eliminate the need for validation.",
      "Validation failures will happen, so plan for them. A good loop asks the model, validates, and on failure sends the model its own output with a precise error message, such as which field was missing, and asks it to correct it. Limit the number of retries, log every failure for later analysis and fall back to a safe default or an error message if the limit is reached. Keep the schema small and the field descriptions clear, because simpler structures fail less often.",
      "Tool use, or function calling, lets the model request actions such as searching, looking up an order or creating a ticket. The model does not run anything itself; it returns a tool name and arguments, and your code decides whether and how to execute them. Define each tool with a narrow purpose, a typed argument schema and a clear description. Validate arguments exactly as you would for any API, check permissions for the current user, and return results as structured data.",
      "Design for safety and cost. Give the model the fewest tools needed, and make read-only tools the default. Require confirmation for actions that change data or cost money. Set timeouts, limit the number of tool calls per request and log each call with its arguments and result, so you can reconstruct what happened. A model that can call many powerful tools without checks is a security risk, not a convenience.",
    ],
    keyIdeas: ["Ask for a schema, then validate; treat output as untrusted", "Retry with the error message, with a hard limit", "The model requests tools; your code validates and executes", "Minimal tools, read-only by default, confirm risky actions"],
    example: {
      title: "Validated structured output with retry (using a stub model)",
      lang: "python",
      code: `import json
from typing import Literal

from pydantic import BaseModel, Field, ValidationError


class Ticket(BaseModel):
    category: Literal["billing", "bug", "feature_request", "other"]
    priority: int = Field(ge=1, le=4)
    summary: str = Field(min_length=5, max_length=120)


# Stand-in for an LLM call: first reply is invalid, the retry is valid.
_replies = iter([
    '{"category": "refund", "priority": 9, "summary": "Charged twice"}',
    '{"category": "billing", "priority": 2, "summary": "Customer was charged twice"}',
])


def call_llm(prompt: str) -> str:
    return next(_replies)


def extract_ticket(message: str, max_attempts: int = 3) -> Ticket:
    prompt = f"Return JSON with category, priority (1-4) and summary for this message:\\n{message}"
    for attempt in range(1, max_attempts + 1):
        raw = call_llm(prompt)
        try:
            return Ticket.model_validate_json(raw)
        except ValidationError as err:
            problems = "; ".join(f"{'.'.join(map(str, e['loc']))}: {e['msg']}" for e in err.errors())
            print(f"attempt {attempt} rejected -> {problems}")
            prompt = (
                f"Your previous JSON was invalid ({problems}). "
                f"Return corrected JSON only.\\nPrevious: {raw}"
            )
    raise RuntimeError("model did not return valid output; route to a human")


print(extract_ticket("I was charged twice for my subscription"))`,
      walkthrough: ["The schema defines allowed categories and ranges, so invalid values are rejected before use.", "On failure the error message is fed back to the model, and attempts are capped.", "After the final failure the code raises an error, which should route to a human or a safe fallback."],
    },
    practice: [
      { task: "Define a schema for extracting an order from a customer message. Make the model fail validation on purpose and log what happens.", hint: "Remove a required field from the reply and watch the error message." },
      { task: "Design three tools for a support assistant. For each, state its arguments, whether it is read-only and what permission check it needs.", hint: "Anything that changes data should require confirmation." },
    ],
    quiz: [
      { q: "Why validate model output even with a structured-output mode?", options: ["It is slower", "Outputs can still be wrong, out of range, or malicious in content", "Validation is optional", "To increase cost"], answer: 1, why: "A valid shape does not guarantee valid values or safe content." },
      { q: "In function calling, who executes the tool?", options: ["The model", "Your code, after validating the requested call", "The user's browser", "The vendor"], answer: 1, why: "The model only requests a call; your application decides whether and how to run it." },
      { q: "What is a sensible limit policy for retries?", options: ["Unlimited", "A small fixed number, then fall back or escalate", "Exactly one with no feedback", "Retry until it works"], answer: 1, why: "Retries cost money and time; cap them and have a fallback." },
    ],
    pitfalls: ["Passing raw model output into SQL or shell commands", "Unlimited retries and tool calls", "Giving the model powerful write tools without confirmation"],
  },
];
