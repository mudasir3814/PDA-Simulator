from flask import Flask, render_template, request, jsonify
from collections import deque

app = Flask(__name__, static_folder="static", template_folder=".")

# ---------- PDA DEFINITIONS ----------
def pda_balanced_parentheses():
    Z = "$"
    t = {
        ("q0", "(", Z): [("q0", "A" + Z)],
        ("q0", "(", "A"): [("q0", "AA")],
        ("q0", ")", "A"): [("q0", "")],
        ("q0", "", Z): [("qf", Z)]
    }
    return {"states": ["q0", "qf"], "start": "q0", "accepts": ["qf"],
            "stack_start": Z, "transitions": t}

def pda_anbn():
    Z = "$"
    t = {
        ("q0", "a", Z): [("q0", "A" + Z)],
        ("q0", "a", "A"): [("q0", "AA")],
        ("q0", "b", "A"): [("q1", "")],
        ("q1", "b", "A"): [("q1", "")],
        ("q1", "", Z): [("qf", Z)]
    }
    return {"states": ["q0", "q1", "qf"], "start": "q0", "accepts": ["qf"], 
            "stack_start": Z, "transitions": t}

def pda_a_plus_b_star():
    Z = "$"
    t = {
        ("q0", "a", Z): [("q0", Z)],
        ("q0", "a", "a"): [("q0", "a")],
        ("q0", "a", "b"): [("q0", "b")],
        ("q0", "b", Z): [("q0", Z)],
        ("q0", "b", "a"): [("q0", "a")],
        ("q0", "b", "b"): [("q0", "b")],
        ("q0", "", Z): [("qf", Z)]
    }
    return {"states": ["q0", "qf"], "start": "q0", "accepts": ["qf"], 
            "stack_start": Z, "transitions": t}

def pda_palindrome():
    """
    Palindromes over {a,b}, supports both even and odd length.
    Strategy: Push first half, non-deterministically guess middle, 
    optionally skip one character (for odd palindromes), then match second half.
    """
    Z = "$"
    t = {}

    # Phase 1: Push symbols onto stack (reading left side)
    # Each transition can either push OR move to matching phase (for odd-length)
    t[("q0", "a", Z)] = [("q0", "a" + Z), ("q1", Z)]  # push OR skip middle 'a'
    t[("q0", "b", Z)] = [("q0", "b" + Z), ("q1", Z)]  # push OR skip middle 'b'
    t[("q0", "a", "a")] = [("q0", "aa"), ("q1", "a")]  # push OR skip middle 'a'
    t[("q0", "a", "b")] = [("q0", "ab"), ("q1", "b")]  # push OR skip middle 'a'
    t[("q0", "b", "a")] = [("q0", "ba"), ("q1", "a")]  # push OR skip middle 'b'
    t[("q0", "b", "b")] = [("q0", "bb"), ("q1", "b")]  # push OR skip middle 'b'

    # Phase 2: Non-deterministically guess we've reached middle (even-length)
    t[("q0", "", Z)] = [("q1", Z)]
    t[("q0", "", "a")] = [("q1", "a")]
    t[("q0", "", "b")] = [("q1", "b")]

    # Phase 3: Match input with stack (pop matching symbols)
    t[("q1", "a", "a")] = [("q1", "")]
    t[("q1", "b", "b")] = [("q1", "")]

    # Phase 4: Accept if we've consumed all input and stack is empty
    t[("q1", "", Z)] = [("qf", Z)]

    return {
        "states": ["q0", "q1", "qf"],
        "start": "q0",
        "accepts": ["qf"],
        "stack_start": Z,
        "transitions": t
    }

def pda_anbn_c_star():
    """
    Language: a^n b^n c*
    """
    Z = "$"
    t = {
        ("q0", "a", Z): [("q0", "A" + Z)],
        ("q0", "a", "A"): [("q0", "AA")],
        ("q0", "b", "A"): [("q1", "")],
        ("q1", "b", "A"): [("q1", "")],
        ("q1", "c", Z): [("q1", Z)],
        ("q1", "", Z): [("qf", Z)]
    }
    return {"states": ["q0", "q1", "qf"], "start": "q0", "accepts": ["qf"],
            "stack_start": Z, "transitions": t}

def pda_wwr():
    """
    Language: ww^r (w followed by its reverse)
    """
    Z = "$"
    t = {}

    # Push phase
    t[("q0", "a", Z)] = [("q0", "a" + Z)]
    t[("q0", "b", Z)] = [("q0", "b" + Z)]
    t[("q0", "a", "a")] = [("q0", "aa")]
    t[("q0", "a", "b")] = [("q0", "ab")]
    t[("q0", "b", "a")] = [("q0", "ba")]
    t[("q0", "b", "b")] = [("q0", "bb")]

    # Non-deterministically guess middle
    t[("q0", "", Z)] = [("q1", Z)]
    t[("q0", "", "a")] = [("q1", "a")]
    t[("q0", "", "b")] = [("q1", "b")]

    # Pop and match
    t[("q1", "a", "a")] = [("q1", "")]
    t[("q1", "b", "b")] = [("q1", "")]

    # Accept
    t[("q1", "", Z)] = [("qf", Z)]

    return {"states": ["q0", "q1", "qf"], "start": "q0", "accepts": ["qf"],
            "stack_start": Z, "transitions": t}

def pda_a2n_b():
    """
    Language: a^(2n) b^n
    For every 2 a's, push 2 A's, then pop 1 A per b
    """
    Z = "$"
    t = {
        ("q0", "a", Z): [("q1", Z)],
        ("q0", "a", "A"): [("q1", "A")],
        ("q1", "a", Z): [("q0", "A" + Z)],
        ("q1", "a", "A"): [("q0", "AA")],
        ("q0", "b", "A"): [("q2", "")],
        ("q2", "b", "A"): [("q2", "")],
        ("q2", "", Z): [("qf", Z)]
    }
    return {
        "states": ["q0", "q1", "q2", "qf"],
        "start": "q0",
        "accepts": ["qf"],
        "stack_start": Z,
        "transitions": t
    }

def pda_a_b_equal_c():
    """
    Language: a^n b^m c^(n+m)
    Strategy: Push one symbol for each 'a', push one symbol for each 'b',
    then pop one symbol for each 'c'. Accept when stack is empty.
    """
    Z = "$"
    t = {
        # Push phase for a's
        ("q0", "a", Z): [("q0", "A" + Z)],
        ("q0", "a", "A"): [("q0", "AA")],
        ("q0", "a", "B"): [("q0", "AB")],
        
        # Push phase for b's
        ("q0", "b", Z): [("q0", "B" + Z)],
        ("q0", "b", "A"): [("q0", "BA")],
        ("q0", "b", "B"): [("q0", "BB")],
        
        # Pop phase for c's (can pop either A or B)
        ("q0", "c", "A"): [("q0", "")],
        ("q0", "c", "B"): [("q0", "")],
        
        # Accept
        ("q0", "", Z): [("qf", Z)]
    }
    return {
        "states": ["q0", "qf"],
        "start": "q0",
        "accepts": ["qf"],
        "stack_start": Z,
        "transitions": t
    }

# ---------- SIMULATOR ----------

def simulate_npda(pda, input_str, max_steps=10000):
    transitions = pda["transitions"]
    start = pda["start"]
    accepts = set(pda["accepts"])
    start_stack = pda["stack_start"]

    initial = (start, 0, start_stack)
    queue = deque([(initial, [initial])])
    visited = set()
    steps = 0

    while queue:
        (state, pos, stack), path = queue.popleft()
        steps += 1
        if steps > max_steps:
            return {"accepted": False, "trace": [], "reason": "timeout"}

        # Accept if in accept state, consumed all input, and stack has only start symbol
        if state in accepts and pos == len(input_str) and stack == start_stack:
            trace = [{"state": s, "pos": p, "remaining": input_str[p:], "stack": st} 
                     for (s, p, st) in path]
            return {"accepted": True, "trace": trace}

        top = stack[0] if stack else ""
        current_symbol = input_str[pos] if pos < len(input_str) else ""
        
        candidate_keys = []
        # Try consuming input
        if pos < len(input_str) and top:
            candidate_keys.append((state, current_symbol, top))
        # Try epsilon transition
        if top:
            candidate_keys.append((state, "", top))

        for key in candidate_keys:
            if key in transitions:
                for (next_state, push) in transitions[key]:
                    # Remove top of stack
                    new_stack = stack[1:] if top else stack
                    # Push new symbols
                    new_stack = push + new_stack
                    # Advance position only if we consumed input
                    new_pos = pos + (1 if key[1] != "" else 0)
                    
                    cfg = (next_state, new_pos, new_stack)
                    if cfg not in visited:
                        visited.add(cfg)
                        queue.append((cfg, path + [cfg]))

    return {"accepted": False, "trace": []}

# ---------- ROUTES ----------

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/pdalist")
def pdalist():
    return jsonify({
        "pdas": [
            {"id": "balanced_parentheses", "name": "Balanced Parentheses ( )"},
            {"id": "anbn", "name": "aⁿbⁿ"},
            {"id": "palindrome", "name": "Palindrome (a,b)"},
            {"id": "a_plus_b_star", "name": "(a+b)*"},
            {"id": "anbn_c_star", "name": "aⁿbⁿc*"},
            {"id": "wwr", "name": "wwʳ (Mirror Strings)"},
            {"id": "a2n_b", "name": "a²ⁿbⁿ"},
            {"id": "a_b_equal_c", "name": "aⁿbᵐcⁿ⁺ᵐ"}
        ]
    })

@app.route("/simulate", methods=["POST"])
def simulate():
    body = request.json
    pid = body.get("pda_id")
    s = body.get("input", "")
    mapping = {
        "balanced_parentheses": pda_balanced_parentheses,
        "anbn": pda_anbn,
        "palindrome": pda_palindrome,
        "a_plus_b_star": pda_a_plus_b_star,
        "anbn_c_star": pda_anbn_c_star,
        "wwr": pda_wwr,
        "a2n_b": pda_a2n_b,
        "a_b_equal_c": pda_a_b_equal_c
    }
    if pid not in mapping:
        return jsonify({"accepted": False, "trace": [], "reason": "unknown PDA"})
    result = simulate_npda(mapping[pid](), s)
    return jsonify(result)

if __name__ == "__main__":

    app.run(debug=True)
