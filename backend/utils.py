def _parse_int(val, field_name, min_val=None, allow_none=False):
    """Parse and validate integer fields from request payload.
    Returns (parsed_int, error_message). On error, parsed_int is None."""
    if val is None:
        if allow_none:
            return None, None
        return None, f"'{field_name}' is required"
    if isinstance(val, bool):
        return None, f"'{field_name}' must be an integer, not a boolean"
    try:
        val_int = int(val)
    except (ValueError, TypeError):
        return None, f"'{field_name}' must be a valid integer"

    if min_val is not None and val_int < min_val:
        return None, f"'{field_name}' must be at least {min_val}"

    return val_int, None
