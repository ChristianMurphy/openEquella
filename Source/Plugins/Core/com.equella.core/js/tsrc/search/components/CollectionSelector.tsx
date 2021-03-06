/*
 * Licensed to The Apereo Foundation under one or more contributor license
 * agreements. See the NOTICE file distributed with this work for additional
 * information regarding copyright ownership.
 *
 * The Apereo Foundation licenses this file to you under the Apache License,
 * Version 2.0, (the "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Checkbox, Chip, TextField, Tooltip } from "@material-ui/core";
import CheckBoxIcon from "@material-ui/icons/CheckBox";
import CheckBoxOutlineBlankIcon from "@material-ui/icons/CheckBoxOutlineBlank";
import { Autocomplete, AutocompleteGetTagProps } from "@material-ui/lab";
import * as OEQ from "@openequella/rest-api-client";
import * as React from "react";
import { useEffect, useState } from "react";
import {
  Collection,
  collectionListSummary,
} from "../../modules/CollectionsModule";
import { languageStrings } from "../../util/langstrings";
import useError from "../../util/useError";

interface CollectionSelectorProps {
  /**
   * Fires if an error is caught that should be reported up.
   * @param error the caught error.
   */
  onError: (error: Error) => void;
  /**
   * Fires when collection selections are changed.
   * @param collections Selected collections.
   */
  onSelectionChange: (collections: Collection[]) => void;
  /**
   * Initially selected collections.
   */
  value?: Collection[];
}

/**
 * As a refine search control, this component is used to filter search results by collections.
 * The initially selected collections are either provided through props or an empty array.
 */
export const CollectionSelector = ({
  onError,
  onSelectionChange,
  value,
}: CollectionSelectorProps) => {
  const collectionSelectorStrings =
    languageStrings.searchpage.collectionSelector;
  const [collections, setCollections] = useState<Collection[]>([]);
  const handleError = useError(onError);

  useEffect(() => {
    collectionListSummary([OEQ.Acl.ACL_SEARCH_COLLECTION])
      .then((collections: Collection[]) => setCollections(collections))
      .catch(handleError);
  }, [handleError]);

  return (
    <Autocomplete
      multiple
      limitTags={2}
      renderTags={(
        collections: Collection[],
        getTagProps: AutocompleteGetTagProps
      ) =>
        collections.map((collection: Collection, index: number) => (
          <Tooltip title={collection.name} key={collection.uuid}>
            <Chip
              style={{ maxWidth: "50%" }}
              id={"collectionChip " + collection.uuid}
              label={collection.name}
              {...getTagProps({ index })}
            />
          </Tooltip>
        ))
      }
      onChange={(_, value: Collection[]) => {
        onSelectionChange(value);
      }}
      value={value ?? []}
      options={collections}
      disableCloseOnSelect
      getOptionLabel={(collection) => collection.name}
      getOptionSelected={(collection, selected) =>
        selected.uuid === collection.uuid
      }
      renderOption={(collection, { selected }) => (
        <>
          <Checkbox
            icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
            checkedIcon={<CheckBoxIcon fontSize="small" />}
            checked={selected}
          />
          {collection.name}
        </>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          variant="outlined"
          label={collectionSelectorStrings.title}
          placeholder={collectionSelectorStrings.title}
        />
      )}
    />
  );
};
