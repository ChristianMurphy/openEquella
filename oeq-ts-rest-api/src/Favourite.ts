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
import { is } from 'typescript-is';
import { DELETE, POST } from './AxiosInstance';

/**
 * Type matching server-side Favourite Item model
 */
export interface FavouriteItem {
  /**
   * Item's ID consisting of Item's UUID and version
   */
  itemID: string;
  /**
   * Tags of this Favourite Item
   */
  keywords: string[];
  /**
   * Whether this Favourite Item uses latest Item version
   */
  isAlwaysLatest: boolean;
  /**
   * ID of the related Bookmark.
   */
  bookmarkID?: number;
}

const FAVOURITE_PATH = '/favourite';

/**
 * Add an Item to user's favourites.
 * @param apiBasePath Base URI to the oEQ institution and API
 * @param favouriteItem The Item to be added
 */
export const addFavouriteItem = (
  apiBasePath: string,
  favouriteItem: FavouriteItem
): Promise<FavouriteItem> =>
  POST(
    apiBasePath + FAVOURITE_PATH,
    (data): data is FavouriteItem => is<FavouriteItem>(data),
    favouriteItem
  );

/**
 * Delete one Item from user's favourites.
 * @param apiBasePath Base URI to the oEQ institution and API
 * @param bookmarkID ID of a bookmark
 */
export const deleteFavouriteItem = (
  apiBasePath: string,
  bookmarkID: number
): Promise<void> =>
  DELETE<void>(`${apiBasePath}${FAVOURITE_PATH}/${bookmarkID}`);
