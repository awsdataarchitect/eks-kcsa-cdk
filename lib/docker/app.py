import json
import random
import os
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

# Initialize Flask app with explicit paths
app = Flask(__name__,
           static_folder='static',
           template_folder='templates')
CORS(app)  # Enable CORS for all routes

# Load questions from a JSON file
def load_questions():
    try:
        questions_file = 'questions.json'
        print(f"Loading questions from {questions_file}")
        print(f"Current directory contents: {os.listdir('.')}")
        with open(questions_file, 'r') as file:
            questions = json.load(file)
            print(f"Loaded {len(questions)} questions")
            # Verify domain field is present
            for q in questions:
                if 'domain' not in q:
                    print(f"Warning: Question missing domain: {q['question']}")
            return questions
    except FileNotFoundError as e:
        print(f"Error: questions.json not found at expected location. Error: {str(e)}")
        return []
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON format in questions.json. Error: {str(e)}")
        return []
    except Exception as e:
        print(f"Unexpected error loading questions: {str(e)}")
        return []

questions = load_questions()

if not questions:
    print("Warning: No questions loaded. Please ensure questions.json exists and is valid.")

# Health check endpoint
@app.route('/health')
def health_check():
    return jsonify({"status": "healthy"})

@app.route('/')
def index():
    try:
        return render_template('index.html')
    except Exception as e:
        print(f"Error rendering template: {str(e)}")
        return "Error: Could not load application. Please check server logs.", 500

@app.route('/question', methods=['GET'])
def get_question():
    if not questions:
        return jsonify({
            "question": "No questions available",
            "options": ["Please add questions to the database"],
            "correct_index": 0
        })
    try:
        question = random.choice(questions)
        # Ensure all fields are present and not None
        if not all(key in question for key in ["question", "options", "domain", "overall_explanation"]):
            raise ValueError("Missing required fields in question data")
            
        response_data = {
            "question": question["question"],
            "options": [opt["text"] for opt in question["options"]],
            "correct_index": next(i for i, opt in enumerate(question["options"]) if opt["is_correct"]),
            "overall_explanation": question["overall_explanation"],
            "domain": question["domain"]
        }
        print("Sending response data:", response_data)
        return jsonify(response_data)
    except Exception as e:
        print(f"Error getting question: {str(e)}")
        return jsonify({
            "question": "Error loading question",
            "options": ["Please try again"],
            "correct_index": 0
        })

@app.route('/check_answer', methods=['POST'])
def check_answer():
    try:
        data = request.json
        if not data:
            return jsonify({"result": "Error", "explanation": "No answer data received"})

        question_text = data.get("question")
        selected_index = data.get("selected_answer")

        if not question_text or selected_index is None:
            return jsonify({"result": "Error", "explanation": "Missing question or answer"})

        if question_text == "No questions available" or question_text == "Error loading question":
            return jsonify({"result": "Info", "explanation": "Please wait for questions to load"})

        for question in questions:
            if question["question"] == question_text:
                try:
                    if 0 <= selected_index < len(question["options"]):
                        selected = question["options"][selected_index]
                        if selected["is_correct"]:
                            return jsonify({
                                "result": "✅ Correct!",
                                "explanation": selected["explanation"]
                            })
                        else:
                            return jsonify({
                                "result": "❌ Incorrect!",
                                "explanation": selected["explanation"]
                            })
                    else:
                        return jsonify({
                            "result": "Error",
                            "explanation": "Invalid answer selection"
                        })
                except Exception as e:
                    print(f"Error checking answer: {str(e)}")
                    return jsonify({
                        "result": "Error",
                        "explanation": "Failed to process answer"
                    })

        return jsonify({
            "result": "Error",
            "explanation": "Question not found"
        })
    except Exception as e:
        print(f"Unexpected error in check_answer: {str(e)}")
        return jsonify({
            "result": "Error",
            "explanation": "Internal server error"
        })

if __name__ == '__main__':
    print("\nStarting Flask application...")
    print(f"Current working directory: {os.getcwd()}")
    print(f"Directory contents: {os.listdir('.')}")
    
    # Verify critical files exist
    required_files = [
        ('questions.json', 'Questions file'),
        ('static/quiz.js', 'Quiz JavaScript'),
        ('templates/index.html', 'HTML template')
    ]
    
    all_files_exist = True
    for file_path, desc in required_files:
        exists = os.path.exists(file_path)
        print(f"{desc} exists: {exists} ({file_path})")
        if not exists:
            all_files_exist = False
    
    if not all_files_exist:
        print("\nWARNING: Some required files are missing!")
    
    if questions:
        print(f"\nSuccessfully loaded {len(questions)} questions")
    else:
        print("\nWARNING: No questions loaded!")
    
    print("\nStarting Flask server...")
    app.run(host='0.0.0.0', port=5001, debug=True)
