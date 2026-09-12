import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { Button, Menu, MenuItem, Tooltip } from "@mui/material";
import type React from "react";
import { useId, useState } from "react";

interface DropdownOption<T extends string | number> {
  value: T;
  label: string;
}

interface DropdownParameterProps<T extends string | number> {
  value: T;
  onChange: (value: T) => void;
  icon: React.ReactNode;
  ariaLabel: string;
  options: DropdownOption<T>[];
  label: string;
}

function DropdownParameter<T extends string | number>({
  value,
  onChange,
  icon,
  ariaLabel,
  options,
  label,
}: DropdownParameterProps<T>) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const menuId = useId();
  const isOpen = anchorEl !== null;
  const controlledMenuId = isOpen ? menuId : undefined;
  const selectOption = (selected: T) => {
    onChange(selected);
    setAnchorEl(null);
  };

  return (
    <>
      <Tooltip title={ariaLabel}>
        <Button
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label={ariaLabel}
          aria-haspopup="menu"
          aria-controls={controlledMenuId}
          aria-expanded={isOpen}
          startIcon={icon}
          endIcon={<ArrowDropDownIcon fontSize="small" />}
          sx={{
            color: "text.secondary",
            minHeight: 44,
            px: 1,
            fontSize: "0.75rem",
            whiteSpace: "nowrap",
            "& .MuiButton-startIcon": {
              display: { xs: "none", sm: "inherit" },
            },
          }}
        >
          {label}
        </Button>
      </Tooltip>
      <Menu
        id={menuId}
        anchorEl={anchorEl}
        open={isOpen}
        onClose={() => setAnchorEl(null)}
      >
        {options.map((option) => (
          <MenuItem
            key={String(option.value)}
            selected={option.value === value}
            onClick={() => selectOption(option.value)}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export default DropdownParameter;
