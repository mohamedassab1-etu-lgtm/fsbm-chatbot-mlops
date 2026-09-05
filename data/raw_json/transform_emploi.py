import json

def split_activity_details(data):
    """
    Splits the 'details' string by '-', extracts the module, ignores the second part,
    identifies the group and class room, and replaces the module code with the full 
    module name if it is found at the end of the string.
    """
    for section_data in data:
        emploi_du_temps = section_data.get("emploi_du_temps", {})
        
        for day, schedule in emploi_du_temps.items():
            for time_range, activities in schedule.items():
                
                parsed_activities = []
                
                for activity in activities:
                    act_type = activity.get("type", "")
                    details = activity.get("details", "")
                    
                    # Split by '-' and ignore any empty strings (handles typos like '--')
                    parts = [p.strip() for p in details.split("-") if p.strip()]
                    
                    # Initialize the new dictionary structure
                    new_activity = {
                        "type": act_type,
                        "module": parts[0]
                    }
                    
                    group = None
                    classroom = None
                    
                    # parts[1] is intentionally ignored based on your rules
                    
                    # Iterate through the 3rd part and beyond to find group/salle
                    for part in parts[2:]:
                        first_word = part.split()[0]
                        lower_word = first_word.lower()
                        
                        # Check if it's a group (starts with G, but not G. which is a room like G.S10)
                        if lower_word.startswith("g") and not lower_word.startswith("g."):
                            group = first_word
                        # Check if it's a class (starts with TD, A, CH, B., or G.)
                        elif lower_word.startswith(("td", "a", "ch", "b.", "g.")):
                            classroom = first_word
                            
                    # --- NEW LOGIC: Extract Full Module Name ---
                    # Only do this if there was at least one hyphen (len > 1)
                    if len(parts) > 1:
                        last_part = parts[-1]
                        # Split the last part by the first space only
                        last_part_split = last_part.split(maxsplit=1)
                        
                        # If there is more than 1 element, the rest is the full name
                        if len(last_part_split) > 1:
                            full_module_name = last_part_split[1].strip()
                            # Replace the short code with the full name
                            new_activity["module"] = full_module_name
                    # -------------------------------------------
                            
                    # Only add group and class to the dict if they were found
                    if group:
                        new_activity["groupe"] = group
                    if classroom:
                        new_activity["salle"] = classroom
                        
                    parsed_activities.append(new_activity)
                    
                # Overwrite the old activities list with the newly parsed list
                schedule[time_range] = parsed_activities
                
    return data

if __name__ == "__main__":
    input_filename = 'emplois_parsed.json'
    output_filename = 'emplois_final.json'
    
    try:
        # 1. Read the JSON file
        with open(input_filename, 'r', encoding='utf-8') as file:
            data = json.load(file)
            
        # 2. Transform the data
        updated_data = split_activity_details(data)
        
        # 3. Save the completely structured format
        with open(output_filename, 'w', encoding='utf-8') as file:
            json.dump(updated_data, file, indent=4, ensure_ascii=False)
            
        print(f"Successfully split details and extracted full module names! Data saved to '{output_filename}'.")
        
    except FileNotFoundError:
        print(f"Error: Could not find '{input_filename}'.")