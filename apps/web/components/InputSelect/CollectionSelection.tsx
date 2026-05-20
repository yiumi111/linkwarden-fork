import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { styles } from "./styles";
import { Option } from "@linkwarden/types/inputSelect";
import CreatableSelect from "react-select/creatable";
import Select from "react-select";
import { useCollections } from "@linkwarden/router/collections";
import clsx from "clsx";

type Props = {
  onChange: any;
  showDefaultValue?: boolean;
  defaultValue?:
    | {
        label: string;
        value?: number;
      }
    | undefined;
  value?:
    | {
        label: string;
        value?: number;
      }
    | undefined;
  creatable?: boolean;
  autoFocus?: boolean;
  onBlur?: any;
  className?: string;
  disabled?: boolean;
};

export default function CollectionSelection({
  onChange,
  defaultValue,
  value,
  showDefaultValue = true,
  creatable = true,
  autoFocus,
  onBlur,
  className,
  disabled,
}: Props) {
  const { data: collections = [] } = useCollections();

  const router = useRouter();

  const [options, setOptions] = useState<Option[]>([]);

  const collectionId = Number(router.query.id);

  const activeCollection = collections.find((e: any) => {
    return e.id === collectionId;
  });

  const resolvedDefaultValue = useMemo(() => {
    if (value) return value;
    if (defaultValue) return defaultValue;

    if (activeCollection) {
      return {
        value: activeCollection.id,
        label: activeCollection.name,
      };
    }

    return undefined;
  }, [activeCollection, defaultValue, value]);

  const getParentNames = (parentId: number): string[] => {
    const parentNames = [];
    const parent = collections.find((e: any) => e.id === parentId);

    if (parent) {
      parentNames.push(parent.name);
      if (parent.parentId) {
        parentNames.push(...getParentNames(parent.parentId));
      }
    }

    return parentNames.reverse();
  };

  useEffect(() => {
    const formattedCollections = collections
      .map((e: any) => {
        return {
          value: e.id,
          label: e.name,
          parentsLabel:
            ((e.parentId && getParentNames(e.parentId).join(" > ") + " > ") ||
              "") + e.name,
          ownerId: e.ownerId,
          count: e._count,
          parentId: e.parentId,
        };
      })
      .sort((a: any, b: any) => {
        return a.parentsLabel.localeCompare(b.parentsLabel);
      });

    setOptions(formattedCollections);
  }, [collections]);

  const customOption = ({ data, innerProps }: any) => {
    return (
      <div
        {...innerProps}
        className="px-2 py-2 last:border-0 border-b border-neutral-content hover:bg-neutral-content duration-100 cursor-pointer"
      >
        <div className="flex w-full justify-between items-center">
          <span>{data.label}</span>
          <span className="text-sm text-neutral">{data.count?.links}</span>
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-300">
          {data.parentsLabel}
        </div>
      </div>
    );
  };

  if (creatable) {
    return (
      <CreatableSelect
        isClearable={false}
        isDisabled={disabled}
        className={clsx("react-select-container", className)}
        classNamePrefix="react-select"
        onChange={onChange}
        options={options}
        styles={styles}
        autoFocus={autoFocus}
        onBlur={onBlur}
        defaultValue={showDefaultValue ? resolvedDefaultValue : null}
        value={showDefaultValue ? value : null}
        components={{
          Option: customOption,
        }}
      />
    );
  }

  return (
    <Select
      isClearable={false}
      isDisabled={disabled}
      className={clsx("react-select-container", className)}
      classNamePrefix="react-select"
      onChange={onChange}
      options={options}
      styles={styles}
      autoFocus={autoFocus}
      defaultValue={showDefaultValue ? resolvedDefaultValue : null}
      value={showDefaultValue ? value : null}
      onBlur={onBlur}
      components={{
        Option: customOption,
      }}
    />
  );
}
