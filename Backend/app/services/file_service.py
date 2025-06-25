import ezdxf
import tempfile
import os
import logging
from ezdxf.entities import Polyline, Line, Circle, Arc, Text

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def extract_file_data(file):
    temp_file_path = None
    try:
        logger.debug(f"Début de l'extraction pour le fichier : {file.filename}")
        
        # Créer un fichier temporaire avec un chemin explicite et mode binaire
        with tempfile.NamedTemporaryFile(delete=False, suffix='.dxf', mode='wb') as temp_file:
            # Sauvegarder directement le contenu du fichier uploadé dans le fichier temporaire
            file.save(temp_file)
            temp_file_path = temp_file.name
            logger.debug(f"Fichier temporaire sauvegardé : {temp_file_path}")
        
        # Charger le fichier DXF à partir du chemin temporaire
        logger.debug(f"Lecture du fichier DXF : {temp_file_path}")
        doc = ezdxf.readfile(temp_file_path)
        
        # Extraire les calques (layers)
        layers = [
            {
                "name": layer.dxf.name,
                "color": layer.dxf.color if layer.dxf.color != 0 else 'N/A',  # Align with user_folder_controller.py
                "lineweight": layer.dxf.lineweight if hasattr(layer.dxf, 'lineweight') else None
            }
            for layer in doc.layers 
            if not layer.dxf.name.startswith('*')  # Exclure les calques système
        ]
        
        # Extraire les entités (polylignes, lignes, cercles, arcs, texte, etc.)
        modelspace = doc.modelspace()
        
        polylines = []
        lines = []
        circles = []
        arcs = []
        texts = []
        
        # Utiliser modelspace.query('*') pour itérer sur toutes les entités
        for entity in modelspace.query('*'):
            dxftype = entity.dxftype()
            if dxftype == 'POLYLINE':
                polylines.append({
                    'type': dxftype,
                    'layer': entity.dxf.layer,
                    'vertices': [{'x': v[0], 'y': v[1]} for v in entity.points()],  # Already matches frontend expectation
                    'closed': entity.closed,
                    'color': entity.dxf.color if entity.dxf.color != 0 else 'N/A',
                    'lineweight': entity.dxf.lineweight if hasattr(entity.dxf, 'lineweight') else None
                })
            elif dxftype == 'LWPOLYLINE':
                polylines.append({
                    'type': dxftype,
                    'layer': entity.dxf.layer,
                    'vertices': [{'x': v[0], 'y': v[1]} for v in entity.get_points()],  # Already matches frontend expectation
                    'closed': entity.closed,
                    'color': entity.dxf.color if entity.dxf.color != 0 else 'N/A',
                    'lineweight': entity.dxf.lineweight if hasattr(entity.dxf, 'lineweight') else None
                })
            elif dxftype == 'LINE':
                lines.append({
                    'type': dxftype,
                    'layer': entity.dxf.layer,
                    'start': {'x': entity.dxf.start[0], 'y': entity.dxf.start[1]},  # Use dict for consistency
                    'end': {'x': entity.dxf.end[0], 'y': entity.dxf.end[1]},
                    'color': entity.dxf.color if entity.dxf.color != 0 else 'N/A',
                    'lineweight': entity.dxf.lineweight if hasattr(entity.dxf, 'lineweight') else None
                })
            elif dxftype == 'CIRCLE':
                circles.append({
                    'type': dxftype,
                    'layer': entity.dxf.layer,
                    'center': {'x': entity.dxf.center[0], 'y': entity.dxf.center[1]},  # Use dict for consistency
                    'radius': entity.dxf.radius,
                    'color': entity.dxf.color if entity.dxf.color != 0 else 'N/A',
                    'lineweight': entity.dxf.lineweight if hasattr(entity.dxf, 'lineweight') else None
                })
            elif dxftype == 'ARC':
                arcs.append({
                    'type': dxftype,
                    'layer': entity.dxf.layer,
                    'center': {'x': entity.dxf.center[0], 'y': entity.dxf.center[1]},  # Use dict for consistency
                    'radius': entity.dxf.radius,
                    'start_angle': entity.dxf.start_angle,
                    'end_angle': entity.dxf.end_angle,
                    'color': entity.dxf.color if entity.dxf.color != 0 else 'N/A',
                    'lineweight': entity.dxf.lineweight if hasattr(entity.dxf, 'lineweight') else None
                })
            elif dxftype == 'TEXT':
                texts.append({
                    'type': dxftype,
                    'layer': entity.dxf.layer,
                    'text': entity.dxf.text,
                    'position': {'x': entity.dxf.insert[0], 'y': entity.dxf.insert[1]},  # Use dict for consistency
                    'height': entity.dxf.height,
                    'color': entity.dxf.color if entity.dxf.color != 0 else 'N/A',
                    'lineweight': entity.dxf.lineweight if hasattr(entity.dxf, 'lineweight') else None
                })
        
        # Statistiques globales
        total_entities = len(modelspace)  # Align with user_folder_controller.py
        statistics = {
            "layer_count": len(layers),
            "polyline_count": len(polylines),
            "line_count": len(lines),
            "circle_count": len(circles),
            "arc_count": len(arcs),
            "text_count": len(texts),
            "total_entities": total_entities
        }
        
        logger.debug("Données extraites avec succès")
        return {
            "layers": layers,
            "polylines": polylines,
            "lines": lines,
            "circles": circles,
            "arcs": arcs,
            "texts": texts,
            "statistics": statistics
        }
    
    except Exception as e:
        logger.error(f"Erreur lors de l'extraction des données : {str(e)}", exc_info=True)
        return {"error": f"Erreur lors de l'extraction des données : {str(e)}"}
    
    finally:
        # Nettoyer le fichier temporaire même en cas d'erreur
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
                logger.debug(f"Fichier temporaire supprimé : {temp_file_path}")
            except Exception as e:
                logger.error(f"Erreur lors de la suppression du fichier temporaire : {str(e)}")