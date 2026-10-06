"""
ASL gloss engine.

English is *not* translated word-for-word into signed language. ASL has its
own grammar: function words disappear, word order changes ("I am happy today"
becomes "I HAPPY TODAY") and vocabulary maps to sign glosses.

This module implements a controlled-vocabulary translator:
  * drops English function words (a, an, the, is, are, to, ...)
  * maps a curated dictionary of common words → simple ASL glosses
  * builds a playable sign sequence (word signs + fingerspelled letters)
"""
import re

STOP_WORDS = {
    'a', 'an', 'the', 'is', 'am', 'are', 'was', 'were',
    'to', 'of', 'and', 'or', 'in', 'on', 'at', 'for',
    'do', 'does', 'did', 'be', 'been',
}

GLOSS_HINTS = {
    'bye': ['BYE'],
    'goodbye': ['BYE'],
    'hello': ['HELLO'],
    'hi': ['HI'],
    'thanks': ['THANK', 'YOU'],
    'thank': ['THANK', 'YOU'],
    'please': ['PLEASE'],
    'sorry': ['SORRY'],
    'yes': ['YES'],
    'no': ['NO'],
    'ok': ['OK'],
    'okay': ['OK'],
    'help': ['HELP'],
    'water': ['WATER'],
    'food': ['FOOD'],
    'eat': ['EAT'],
    'home': ['HOME'],
    'house': ['HOME'],
    'school': ['SCHOOL'],
    'college': ['SCHOOL'],
    'hospital': ['HOSPITAL'],
    'doctor': ['DOCTOR'],
    'name': ['NAME'],
    'what': ['WHAT'],
    'who': ['WHO'],
    'where': ['WHERE'],
    'when': ['WHEN'],
    'why': ['WHY'],
    'how': ['HOW'],
    'good': ['GOOD'],
    'bad': ['BAD'],
    'fine': ['GOOD'],
    'happy': ['HAPPY'],
    'sad': ['SAD'],
    'love': ['LOVE'],
    'friend': ['FRIEND'],
    'family': ['FAMILY'],
    'i': ['I'],
    'you': ['YOU'],
    'me': ['ME'],
    'we': ['WE'],
    'they': ['THEY'],
    'go': ['GO'],
    'going': ['GO'],
    'come': ['COME'],
    'want': ['WANT'],
    'need': ['NEED'],
    'live': ['LIVE'],
    'work': ['WORK'],
    'sleep': ['SLEEP'],
    'learn': ['LEARN'],
    'sign': ['SIGN'],
    'language': ['LANGUAGE'],
    'today': ['TODAY'],
    'tomorrow': ['TOMORROW'],
    'yesterday': ['YESTERDAY'],
    'morning': ['MORNING'],
    'afternoon': ['AFTERNOON'],
    'evening': ['EVENING'],
    'night': ['NIGHT'],
    'understand': ['UNDERSTAND'],
    'hear': ['HEAR'],
    'speak': ['SPEAK'],
    'talk': ['TALK'],
    'give': ['GIVE'],
    'take': ['TAKE'],
    'see': ['SEE'],
    'now': ['NOW'],
    'later': ['LATER'],
    'again': ['AGAIN'],
    'always': ['ALWAYS'],
    'never': ['NEVER'],
    'more': ['MORE'],
    'little': ['LITTLE'],
    'big': ['BIG'],
    'book': ['BOOK'],
    'drink': ['DRINK'],
    'computer': ['COMPUTER'],
    'before': ['BEFORE'],
    'chair': ['CHAIR'],
    'clothes': ['CLOTHES'],
    'candy': ['CANDY'],
    'cousin': ['COUSIN'],
    'deaf': ['DEAF'],
    'thin': ['THIN'],
    'walk': ['WALK'],
    'year': ['YEAR'],
    'all': ['ALL'],
    'black': ['BLACK'],
    'cool': ['COOL'],
    'finish': ['FINISH'],
    'hot': ['HOT'],
    'like': ['LIKE'],
    'many': ['MANY'],
    'mother': ['MOTHER'],
    'orange': ['ORANGE'],
    'table': ['TABLE'],
    'thanksgiving': ['THANKSGIVING'],
    'woman': ['WOMAN'],
    'bed': ['BED'],
    'blue': ['BLUE'],
    'bowling': ['BOWLING'],
    'can': ['CAN'],
    'dog': ['DOG'],
    'fish': ['FISH'],
    'graduate': ['GRADUATE'],
    'hat': ['HAT'],
    'hearing': ['HEARING'],
    'kiss': ['KISS'],
    'man': ['MAN'],
    'shirt': ['SHIRT'],
    'study': ['STUDY'],
    'tall': ['TALL'],
}

_ALPHA_RE = re.compile(r'[^A-Za-z]')


def clean_word(word):
    return _ALPHA_RE.sub('', word.upper())


def to_asl_gloss(text):
    """English sentence → ordered list of ASL gloss tokens for all spoken words."""
    words = text.split()
    gloss = []
    for raw in words:
        word = clean_word(raw)
        if not word:
            continue
        hint = GLOSS_HINTS.get(word.lower())
        if hint:
            gloss.extend(hint)
        else:
            gloss.append(word)
    if not gloss:
        gloss = [clean_word(w) for w in words if clean_word(w)]
    return gloss


# Every gloss token is fingerspelled letter by letter: the sign player only has
# real ASL handshape imagery for A-Z, so a whole-word card would fall back to a
# plain text glyph instead of an actual sign.
def build_sign_sequence(text):
    """Produce a flat list of sign actions (letters + spaces) for all spoken words."""
    gloss = to_asl_gloss(text)
    sequence = []
    for idx, item in enumerate(gloss):
        letters = [c for c in item if c.isalpha()]
        if not letters:
            continue
        if idx > 0:
            sequence.append({'type': 'space', 'value': 'space'})
        for ch in letters:
            sequence.append({'type': 'letter', 'value': ch})
    return sequence