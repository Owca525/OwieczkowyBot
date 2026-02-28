from utils import logger

def readFromFile(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        return content
    except FileNotFoundError:
        return None
    except Exception as e:
        logger.error(e, stack_info=True)
        return None


def writeToFile(file_path, text):
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(text)
    except Exception as e:
        logger.error(e, stack_info=True)
