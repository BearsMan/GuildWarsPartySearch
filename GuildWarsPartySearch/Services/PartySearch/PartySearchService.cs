﻿using GuildWarsPartySearch.Common.Models.GuildWars;
using GuildWarsPartySearch.Server.Models.Endpoints;
using GuildWarsPartySearch.Server.Services.Database;
using Microsoft.Extensions.Logging;
using System.Core.Extensions;
using System.Extensions;

namespace GuildWarsPartySearch.Server.Services.PartySearch;

public sealed class PartySearchService : IPartySearchService
{
    private readonly IPartySearchDatabase partySearchDatabase;
    private readonly ILogger<PartySearchService> logger;

    public PartySearchService(
        IPartySearchDatabase partySearchDatabase,
        ILogger<PartySearchService> logger)
    {
        this.partySearchDatabase = partySearchDatabase.ThrowIfNull();
        this.logger = logger.ThrowIfNull();
    }

    public async Task<Result<List<PartySearchEntry>, GetPartySearchFailure>> GetPartySearch(Campaign? campaign, Continent? continent, Region? region, Map? map, string? district)
    {
        if (campaign is null)
        {
            return new GetPartySearchFailure.InvalidCampaign();
        }

        if (continent is null)
        {
            return new GetPartySearchFailure.InvalidContinent();
        }

        if (region is null)
        {
            return new GetPartySearchFailure.InvalidRegion();
        }

        if (map is null)
        {
            return new GetPartySearchFailure.InvalidMap();
        }

        if (district?.IsNullOrWhiteSpace() is not false)
        {
            return new GetPartySearchFailure.InvalidDistrict();
        }

        //TODO: Validate district

        var result = await this.partySearchDatabase.GetPartySearches(campaign, continent, region, map, district);
        if (result is not List<Models.Database.PartySearch> entries)
        {
            return new GetPartySearchFailure.EntriesNotFound();
        }

        return entries.Select(e => new PartySearchEntry
        {
            PartySize = e.PartySize,
            PartyMaxSize = e.PartyMaxSize,
            Npcs = e.Npcs
        }).ToList();
    }

    public async Task<Result<PostPartySearchRequest, PostPartySearchFailure>> PostPartySearch(PostPartySearchRequest? request)
    {
        if (request is null)
        {
            return new PostPartySearchFailure.InvalidPayload();
        }

        if (request.Campaign is null)
        {
            return new PostPartySearchFailure.InvalidCampaign();
        }

        if (request.Continent is null)
        {
            return new PostPartySearchFailure.InvalidContinent();
        }

        if (request.Region is null)
        {
            return new PostPartySearchFailure.InvalidRegion();
        }

        if (request.Map is null)
        {
            return new PostPartySearchFailure.InvalidMap();
        }

        if (request.District is null)
        {
            return new PostPartySearchFailure.InvalidDistrict();
        }

        if (request.PartySearchEntries is null)
        {
            return new PostPartySearchFailure.InvalidEntries();
        }

        foreach(var entry in request.PartySearchEntries)
        {
            if (entry.PartySize is null)
            {
                return new PostPartySearchFailure.InvalidPartySize();
            }

            if (entry.PartyMaxSize is null)
            {
                return new PostPartySearchFailure.InvalidPartyMaxSize();
            }

            if (entry.Npcs is null)
            {
                return new PostPartySearchFailure.InvalidNpcs();
            }
        }

        //TODO: Implement district validation, party size validation, party max size validation and npcs validation
        var result = await this.partySearchDatabase.SetPartySearches(
            request.Campaign,
            request.Continent,
            request.Region,
            request.Map,
            request.District,
            request.PartySearchEntries.Select(e => new Models.Database.PartySearch
            {
                Npcs = e.Npcs,
                PartySize = e.PartySize,
                PartyMaxSize = e.PartyMaxSize
            }).ToList());

        if (!result)
        {
            return new PostPartySearchFailure.UnspecifiedFailure
            {
                Message = "Database operation unsuccessful"
            };
        }

        return request;
    }
}
