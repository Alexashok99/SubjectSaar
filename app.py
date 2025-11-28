from flask import Flask, render_template, url_for
from markupsafe import Markup
import re
import os
from static.data.file_path import *

# Flask ऐप शुरू करें
app = Flask(__name__)

# # यह DYNAMIC URLs के लिए बहुत महत्वपूर्ण है
# # यह 'math_vvi' जैसे छोटे नाम को असली JSON फाइल पाथ से जोड़ता है
# TEST_JSON_MAP = {
#     "math_vvi": "data/most_save.json", # (यह फाइल static/data/ में होनी चाहिए)
#     "top_20": "data/top_20.json",
#     "algebra": "data/algebra.json",
#     "coordinate": "data/coordinate.json"
# }

# @app.route('/')
# def index():
#     """होमपेज दिखाता है"""
#     return render_template('index.html')

# @app.route('/summaries')
# def subject_summaries():
#     return render_template('summaries.html')

def load_summaries_cards():
    # Look for summaries.html inside templates folder
    p = os.path.join(app.root_path, 'templates', 'summaries.html')
    if not os.path.isfile(p):
        return ''  # nothing found
    with open(p, 'r', encoding='utf-8') as f:
        content = f.read()
    # Extract first <div class="card-container">...</div>
    m = re.search(r'<div\s+class=["\']card-container["\'][\s\S]*?</div>', content, re.IGNORECASE)
    if not m:
        return ''
    return Markup(m.group(0))

# @app.route('/')
# def index():
#     summaries_html = load_summaries_cards()
#     return render_template('index.html', summaries_cards_html=summaries_html)

@app.route('/')
def index():
    try:
        summaries_html = load_summaries_cards()
    except Exception as e:
        summaries_html = f"<p>Error loading summary cards: {e}</p>"
    return render_template('index.html', summaries_cards_html=summaries_html)


@app.route('/summaries')
def subject_summaries():
    return render_template('summaries.html')


@app.route('/premium-tests')
def premium_tests():
    return render_template('premium_tests.html')

@app.route('/about')
def about():
    return render_template('about.html')


@app.route('/mathematics/')
def mathematics_hub():
    """मैथमेटिक्स हब पेज दिखाता है"""
    return render_template('mathematics_hub.html')


@app.route('/test/<test_id>')
def run_test(test_id):
    """
    यह डायनामिक रूट है। 
    /test/math_vvi या /test/top_20 जैसा कोई भी URL इस फंक्शन को चलाएगा।
    """
    # test_id (जैसे 'math_vvi') के आधार पर JSON फाइल का पाथ ढूँढें
    json_file = TEST_JSON_MAP.get(test_id)
    
    if not json_file:
        # अगर कोई गलत test_id डाल दे (जैसे /test/biology)
        return "Error: Test not found.", 404
    
    # test_template.html को रेंडर करें और उसे JSON फाइल का पाथ पास करें
    return render_template('test_template.html', json_file_path=json_file)


if __name__ == '__main__':
    # ऐप को 'debug' मोड में चलाएं (डेवलपमेंट के लिए)
    app.run(debug=True)